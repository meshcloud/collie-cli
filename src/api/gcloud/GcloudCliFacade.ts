import {
  Config,
  CostBigQueryResult,
  IamResponse,
  Labels,
  Project,
} from "./Model.ts";
import { GcpErrorCode, MeshGcpPlatformError } from "/errors.ts";
import {
  GcpBillingExportConfig,
  GcpCostCollectionViewName,
} from "./GcpBillingExportConfig.ts";
import { parseJsonWithLog } from "/json.ts";
import { moment } from "/deps.ts";
import { GcloudCliResultHandler } from "./GcloudCliResultHandler.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ResultHandlerProcessRunnerDecorator } from "../../process/ResultHandlerProcessRunnerDecorator.ts";
import { CliDetector } from "../CliDetector.ts";
import { CLI } from "../../info.ts";

export class GcloudCliFacade {
  private readonly processRunner: IProcessRunner<ProcessResultWithOutput>;

  constructor(
    rawRunner: IProcessRunner<ProcessResultWithOutput>,
    private readonly billingConfig?: GcpBillingExportConfig,
  ) {
    const detector = new CliDetector(rawRunner);

    this.processRunner = new ResultHandlerProcessRunnerDecorator(
      rawRunner,
      new GcloudCliResultHandler(detector),
    );
  }
  async configList(): Promise<Config> {
    return await this.run<Config>(["gcloud", "config", "list"]);
  }

  async listProjects(): Promise<Project[]> {
    return await this.run<Project[]>(["gcloud", "projects", "list"]);
  }

  async updateTags(project: Project, labels: Labels): Promise<void> {
    if (Object.entries(labels).length === 0) {
      return;
    }

    const labelStr = Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)
      .join(",");

    await this.run([
      "gcloud",
      "alpha",
      "projects",
      "update",
      project.projectId,
      "--update-labels",
      labelStr,
    ]);
  }

  async listIamPolicy(project: Project): Promise<IamResponse[]> {
    // todo: handle access denied errors at a higher level, probably in a facade decorator?
    return await this.run<IamResponse[]>([
      "gcloud",
      "projects",
      "get-ancestors-iam-policy",
      project.projectId,
    ]);
  }

  async listCosts(
    startDate: Date,
    endDate: Date,
  ): Promise<CostBigQueryResult[]> {
    if (!this.billingConfig) {
      throw new MeshGcpPlatformError(
        GcpErrorCode.GCP_CLI_GENERAL,
        `${CLI} is not configured for GCP cost reporting`,
      );
    }
    const billingProject = this.billingConfig.projectId;
    const viewName =
      `${billingProject}.${this.billingConfig.datasetName}.${GcpCostCollectionViewName}`;
    const format = "YYYYMM";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);
    const query =
      `SELECT * FROM \`${viewName}\` where invoice_month >= "${start}" AND invoice_month <= "${end}"`;

    const command = [
      "bq",
      "--project_id",
      billingProject,
      "query",
      "--format",
      "json",
      "--nouse_legacy_sql",
      query,
    ];

    const result = await this.processRunner.run(command);

    return parseJsonWithLog<CostBigQueryResult[]>(result.stdout);
  }

  private async run<T>(command: string[]) {
    const result = await this.processRunner.run([
      ...command,
      "--format",
      "json",
    ]);

    return parseJsonWithLog<T>(result.stdout);
  }
}
