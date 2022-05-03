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
import { PlatformCommandInstallationStatus } from "../../cli-detector.ts";
import { GcloudCliResultHandler } from "./GcloudCliResultHandler.ts";
import { IShellRunner } from "../../process/IShellRunner.ts";
import { ProcessResultWithOutput } from "../../process/ShellRunnerResult.ts";
import { ShellRunnerResultHandlerDecorator } from "../../process/ShellRunnerResultHandlerDecorator.ts";

// todo: rename to GcloudCliFacade
export class GcpCliFacade implements CliFacade {
  private readonly shellRunner: IShellRunner<ProcessResultWithOutput>;

  constructor(
    private readonly rawRunner: IShellRunner<ProcessResultWithOutput>,
    private readonly billingConfig?: GcpBillingExportConfig,
  ) {
    // todo: consider wrapping the shellrunner further, e.g. to always add --output=json so we become more independent
    // of the user's global aws cli config
    this.shellRunner = new ShellRunnerResultHandlerDecorator(
      this.rawRunner,
      new GcloudCliResultHandler(),
    );
  }

  // todo: maybe factor detection logic into its own class, not part of the facade?
  async verifyCliInstalled(): Promise<CliInstallationStatus> {
    try {
      const result = await this.rawRunner.run(["gcloud", "--version"]);

      return {
        cli: "gcloud",
        status: this.determineInstallationStatus(result),
      };
    } catch {
      return {
        cli: "gcloud",
        status: PlatformCommandInstallationStatus.NotInstalled,
      };
    }
  }

  private determineInstallationStatus(result: ProcessResultWithOutput) {
    if (result.status.code !== 0) {
      return PlatformCommandInstallationStatus.NotInstalled;
    }

    const regex = /^Google Cloud SDK/;

    return regex.test(result.stdout)
      ? PlatformCommandInstallationStatus.Installed
      : PlatformCommandInstallationStatus.UnsupportedVersion;
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

    const result = await this.shellRunner.run(command);

    return parseJsonWithLog<CostBigQueryResult[]>(result.stdout);
  }

  private async run<T>(command: string[]) {
    const result = await this.shellRunner.run([...command, "--format", "json"]);

    return parseJsonWithLog<T>(result.stdout);
  }
}
