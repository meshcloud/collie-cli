import { ShellRunner } from "../process/shell-runner.ts";
import {
  CostBigQueryResult,
  IamResponse,
  Labels,
  Project,
} from "./gcp.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import {
  GcpErrorCode,
  MeshGcpPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import {
  CLICommand,
  GcpBillingExportConfig,
  GcpCostCollectionViewName,
} from "../config/config.model.ts";
import { parseJsonWithLog } from "../json.ts";
import { moment } from "../deps.ts";

export class GcpCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
    private readonly billingConfig: GcpBillingExportConfig,
  ) {}
  private unauthorizedProject = /User is not permitted/;

  async listProjects(): Promise<Project[]> {
    const command = "gcloud projects list --format json";
    const result = await this.shellRunner.run(
      command,
    );
    this.checkForErrors(result);

    console.debug(`listProjects: ${JSON.stringify(result)}`);

    return parseJsonWithLog<Project[]>(result.stdout);
  }

  async updateTags(project: Project, labels: Labels): Promise<void> {
    const labelStr = Object.entries(labels).map(([key, value]) => {
      `${key}=${value}`;
    }).join(" ");

    // For more information see https://cloud.google.com/sdk/gcloud/reference/alpha/projects/update
    const command =
      `gcloud alpha projects update ${project.projectId} --clear-labels --update-labels "${labelStr}"`;
    const result = await this.shellRunner.run(
      command,
    );
    this.checkForErrors(result);

    console.debug(`updateTags: ${JSON.stringify(result)}`);
  }

  async listIamPolicy(project: Project): Promise<IamResponse[]> {
    const command =
      `gcloud projects get-ancestors-iam-policy ${project.projectId} --format json`;
    const result = await this.shellRunner.run(
      command,
    );

    try {
      this.checkForErrors(result);
    } catch (e) {
      if (
        e instanceof MeshGcpPlatformError &&
        e.errorCode == GcpErrorCode.GCP_UNAUTHORIZED
      ) {
        console.error(
          `Could not list IAM policies for Project ${project.projectId}: Access was denied`,
        );
      }
      return Promise.resolve([]);
    }

    console.debug(`listIamPolicy: ${JSON.stringify(result)}`);

    return parseJsonWithLog<IamResponse[]>(result.stdout);
  }

  async listCosts(
    startDate: Date,
    endDate: Date,
  ): Promise<CostBigQueryResult[]> {
    const billingProject = this.billingConfig.projectId;
    const viewName =
      `${billingProject}.${this.billingConfig.datasetName}.${GcpCostCollectionViewName}`;
    const format = "YYYYMM";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);
    const query =
      `SELECT * FROM \`${viewName}\` where invoice_month >= "${start}" AND invoice_month <= "${end}"`;
    const command =
      `bq --project_id ${billingProject} query --format json --nouse_legacy_sql ${query}`;
    const result = await this.shellRunner.run(
      command,
    );

    console.debug(`listCosts: ${JSON.stringify(result)}`);

    this.checkForErrors(result);

    return parseJsonWithLog<CostBigQueryResult[]>(result.stdout);
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code === 2) {
      throw new MeshGcpPlatformError(
        GcpErrorCode.GCP_CLI_GENERAL,
        result.stderr,
      );
    } else if (result.code === 1) {
      if (this.unauthorizedProject.exec(result.stderr)) {
        throw new MeshGcpPlatformError(
          GcpErrorCode.GCP_UNAUTHORIZED,
          "Request could not be made because the current user is not allowed to access this resource",
        );
      } else {
        console.error(
          `You are not logged in into GCP CLI. Please login with "gcloud auth login" or disconnect with "${CLICommand} config --disconnect"`,
        );
        throw new MeshNotLoggedInError(result.stderr);
      }
    }
  }
}
