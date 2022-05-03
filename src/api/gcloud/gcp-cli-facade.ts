import {
  Config,
  CostBigQueryResult,
  IamResponse,
  Labels,
  Project,
} from "./gcp.model.ts";
import { GcpErrorCode, MeshGcpPlatformError } from "/errors.ts";
import {
  CLICommand,
  GcpBillingExportConfig,
  GcpCostCollectionViewName,
} from "/config/config.model.ts";
import { parseJsonWithLog } from "/json.ts";
import { moment } from "/deps.ts";
import { CliFacade, CliInstallationStatus } from "../CliFacade.ts";
import { GcloudCliResultHandler } from "./GcloudCliResultHandler.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerResultHandlerDecorator } from "../../process/ProcessRunnerResultHandlerDecorator.ts";
import { CliDetector } from "../CliDetector.ts";

// todo: rename to GcloudCliFacade
export class GcpCliFacade implements CliFacade {
  private readonly processRunner: IProcessRunner<ProcessResultWithOutput>;
  private readonly detector: CliDetector;

  constructor(
    rawRunner: IProcessRunner<ProcessResultWithOutput>,
    private readonly billingConfig?: GcpBillingExportConfig,
  ) {
    this.detector = new CliDetector(rawRunner);

    this.processRunner = new ProcessRunnerResultHandlerDecorator(
      rawRunner,
      new GcloudCliResultHandler(),
    );
  }

  verifyCliInstalled(): Promise<CliInstallationStatus> {
    return this.detector.verifyCliInstalled("gcloud", /^Google Cloud SDK/);
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
        `${CLICommand} is not configured for GCP cost reporting`,
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
