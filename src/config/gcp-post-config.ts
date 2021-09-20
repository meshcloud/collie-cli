import { Input, Select } from "../deps.ts";
import { AwsErrorCode, MeshAwsPlatformError, MeshError } from "../errors.ts";
import { ShellRunner } from "../process/shell-runner.ts";
import {
  CLICommand,
  CLIName,
  Config,
  ConnectedConfigKey,
  writeConfig,
} from "./config.model.ts";
import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";
import { parseJsonWithLog } from '../json.ts';
import { CostBigQueryResult } from '../gcp/gcp.model.ts';
import { BigQueryListDatasetResult, BigQueryListTableResult } from './gcp-config.model.ts';

export class GcpPostPlatformConfigHook implements PostPlatformConfigHook {
  private readonly materializedViewName: string = "collie_billing_view";
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  isExecutable(platform: ConnectedConfigKey): boolean {
    return platform === "GCP";
  }

  async executeConnected(config: Config) {
    if (config.gcp.billingExport) {
      console.log(
        `You have already configured GCP cost collection with projectId=${config.gcp.billingExport.projectId} and datasetName=${config.gcp.billingExport.datasetName}.`
      );
      return;
    }

    console.log('To enable cost collection for GCP, a billing export must be enabled.');
    console.log('We will guide you through setting up the integration with Collie and the GCP billing export.')
    console.log('Please read the additional instructions here: https://github.com/meshcloud/collie-cli/wiki/setting-up-gcp-cost-collection');

    const projectId = await Input.prompt("What is the ID of the Google Cloud project containing the billing export?");
    const allDatasets = await this.listDatasets(projectId);

    const datasetName: string = await Select.prompt({
      message:
        "What is the dataset ID where the billing export table is located?",
      options: allDatasets,
    });

    const allTables = await this.listTables(projectId, datasetName);
    // TODO: if not, create new big query materialized view, can we check using the allTables above?

    const tableName: string = await Select.prompt({
      message:
        "What is the name of the billing export table?",
      options: allTables,
    });

    await this.createMaterializedView(projectId, datasetName, tableName);

    config.gcp.billingExport = {
      projectId,
      datasetName,
      tableName
    };

    await writeConfig(config);
  }

  async executeDisconnected(_config: Config) {
    // no op
  }

  private async listDatasets(projectId: string): Promise<string[]> {
    const result = await this.shellRunner.run(
      `bq ls --projectId ${projectId} --format json`
    );
    const datasets = parseJsonWithLog<BigQueryListDatasetResult[]>(result.stdout);
    return datasets.map(x => x.datasetReference.datasetId);
  }

  private async listTables(projectId: string, datasetId: string): Promise<string[]> {
    const result = await this.shellRunner.run(
      `bq ls --projectId ${projectId} --dataset_id ${datasetId} --format json`
    );
    const datasets = parseJsonWithLog<BigQueryListTableResult[]>(result.stdout);
    return datasets.map(x => x.tableReference.tableId);
  }

  private async createMaterializedView(projectId: string, datasetName: string, tableName: string): Promise<void> {
    const query = `CREATE MATERIALIZED VIEW \`meshstack-root.billing_export.${this.materializedViewName}\` AS
SELECT
  invoice.month as \`invoice_month\`,
  project.id as \`project_id\`,
  currency,
  (SUM(CAST(cost * 1000000 AS int64) / 1000000)) as \`cost\`
FROM \`${projectId}.${datasetName}.${tableName}\`
GROUP BY 1, 2, 3;`;
    await this.shellRunner.run(
      `bq --project_id ${projectId} query --nouse_legacy_sql ${query}`
    );
  }
}
