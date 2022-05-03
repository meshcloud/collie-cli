// todo: bring this back with a better foundation new command

// import { Input, Select } from "../deps.ts";
// import { ShellRunner } from "../process/shell-runner.ts";
// import {
//   Config,
//   ConnectedConfigKey,
//   GcpCostCollectionViewName,
//   writeConfig,
// } from "./config.model.ts";
// import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";
// import { parseJsonWithLog } from "../json.ts";
// import {
//   BigQueryListDatasetResult,
//   BigQueryListTableResult,
// } from "./gcp-config.model.ts";

// export class GcpPostPlatformConfigHook implements PostPlatformConfigHook {
//   constructor(
//     private readonly shellRunner: ShellRunner,
//   ) {}

//   isExecutable(platform: ConnectedConfigKey): boolean {
//     return platform === "GCP";
//   }

//   async executeConnected(config: Config) {
//     if (config.gcp?.billingExport) {
//       console.log(
//         `You have already configured GCP cost collection with projectId=${config.gcp.billingExport.projectId} and datasetName=${config.gcp.billingExport.datasetName}.`,
//       );
//       return;
//     }

//     console.log(
//       "To enable cost collection for GCP, a billing export must be enabled.",
//     );
//     console.log(
//       "We will guide you through setting up the integration with Collie and the GCP billing export.",
//     );
//     console.log(
//       "Please read the additional instructions here: https://github.com/meshcloud/collie-cli/wiki/setting-up-gcp-cost-collection",
//     );

//     const projectId = await Input.prompt(
//       "What is the ID of the Google Cloud project containing the billing export?",
//     );

//     const allDatasets = await this.listDatasets(projectId);

//     const datasetName: string = await Select.prompt({
//       message:
//         "What is the dataset ID where the billing export table is located?",
//       options: allDatasets,
//     });

//     const allTables = await this.listTables(projectId, datasetName);
//     if (allTables.includes(GcpCostCollectionViewName)) {
//       console.log(
//         "It looks like your BigQuery dataset already contains a Collie view! We will go ahead and re-use that one.",
//       );
//     } else {
//       const tableName: string = await Select.prompt({
//         message: "What is the name of the billing export table?",
//         options: allTables,
//       });

//       await this.createMaterializedView(projectId, datasetName, tableName);
//     }

//     config.gcp = {
//       billingExport: {
//         projectId,
//         datasetName,
//       },
//     };

//     console.log(
//       "That's it, GCP Cost Collection for Collie is now correctly configured!",
//     );

//     await writeConfig(config);
//   }

//   private listDatasets(projectId: string): Promise<string[]> {
//     const bqListFn = async () => {
//       const bgCommand = `bq ls --project_id ${projectId} --format json`;
//       const result = await this.shellRunner.run(bgCommand);
//       const datasets = parseJsonWithLog<BigQueryListDatasetResult[]>(
//         result.stdout,
//       );

//       return datasets.map((x) => x.datasetReference.datasetId);
//     };

//     // This might be the first bq invocation and because of some weird config setup we just capture this problematic output and
//     // retry with the same command. Worked for me.
//     try {
//       return bqListFn();
//     } catch (_) {
//       return bqListFn();
//     }
//   }

//   private async listTables(
//     projectId: string,
//     datasetId: string,
//   ): Promise<string[]> {
//     const result = await this.shellRunner.run(
//       `bq ls --project_id ${projectId} --dataset_id ${datasetId} --format json`,
//     );
//     const datasets = parseJsonWithLog<BigQueryListTableResult[]>(result.stdout);

//     return datasets.map((x) => x.tableReference.tableId);
//   }

//   private async createMaterializedView(
//     projectId: string,
//     datasetName: string,
//     tableName: string,
//   ): Promise<void> {
//     const query =
//       `CREATE MATERIALIZED VIEW \`meshstack-root.billing_export.${GcpCostCollectionViewName}\` AS
// SELECT
//   invoice.month as \`invoice_month\`,
//   project.id as \`project_id\`,
//   currency,
//   (SUM(CAST(cost * 1000000 AS int64) / 1000000)) as \`cost\`
// FROM \`${projectId}.${datasetName}.${tableName}\`
// GROUP BY 1, 2, 3;`;
//     await this.shellRunner.run(
//       `bq --project_id ${projectId} query --nouse_legacy_sql ${query}`,
//     );
//   }
// }
