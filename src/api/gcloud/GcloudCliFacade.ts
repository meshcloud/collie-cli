import {
  Configuration,
  CostBigQueryResult,
  Folder,
  IamResponse,
  Labels,
  Organization,
  Project,
} from "./Model.ts";
import { parseJsonWithLog } from "/json.ts";
import { moment } from "x/deno_moment";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";

export class GcloudCliFacade {
  constructor(
    private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
  ) {}

  async configurationsList(): Promise<Configuration[]> {
    return await this.run(["gcloud", "config", "configurations", "list"]);
  }

  async listProjects(): Promise<Project[]> {
    return await this.run<Project[]>(["gcloud", "projects", "list"]);
  }

  async listOrganizations(): Promise<Organization[]> {
    return await this.run<Organization[]>(["gcloud", "organizations", "list"]);
  }

  async listFolders(
    filter: { organizationId: string } | { folderId: string },
  ): Promise<Folder[]> {
    const baseCmd = ["gcloud", "resource-manager", "folders", "list"];

    if ("organizationId" in filter) {
      return await this.run([
        ...baseCmd,
        "--organization",
        filter.organizationId,
      ]);
    } else {
      return await this.run([...baseCmd, "--folder", filter.folderId]);
    }
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
    options: {
      project: string;
      dataset: string;
      view: string;
    },
  ): Promise<CostBigQueryResult[]> {
    // todo: maybe we should move the bq invocations into their own CliFacade
    // for now we assume that bq is always installed with the google cloud sdk and thus versioned in sync with the gcloud cli
    const viewName = `${options.project}.${options.dataset}.${options.view}`;
    const format = "YYYYMM";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);
    const query =
      `SELECT * FROM \`${viewName}\` where invoice_month >= "${start}" AND invoice_month <= "${end}"`;

    const command = [
      "bq",
      "--project_id",
      options.project,
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
