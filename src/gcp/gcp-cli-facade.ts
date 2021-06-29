import { ShellRunner } from "../process/shell-runner.ts";
import { IamResponse, Project } from "./gcp.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import {
  GcpErrorCode,
  MeshGcpPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { log } from "../deps.ts";
import { CLIName } from "../config/config.model.ts";
import { parseJsonWithLog } from "../json.ts";

export class GcpCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  async listProjects(): Promise<Project[]> {
    const result = await this.shellRunner.run(
      "gcloud projects list --format json",
    );
    this.checkForErrors(result);

    log.debug(`listProjects: ${JSON.stringify(result)}`);

    return parseJsonWithLog<Project[]>(result.stdout);
  }

  async listIamPolicy(project: Project): Promise<IamResponse[]> {
    const result = await this.shellRunner.run(
      `gcloud projects get-ancestors-iam-policy ${project.projectId} --format json`,
    );
    this.checkForErrors(result);

    log.debug(`listIamPolicy: ${JSON.stringify(result)}`);

    return JSON.parse(result.stdout) as IamResponse[];
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code === 2) {
      throw new MeshGcpPlatformError(
        GcpErrorCode.GCP_CLI_GENERAL,
        result.stderr,
      );
    } else if (result.code === 1) {
      log.info(
        `You are not logged in into GCP CLI. Please disconnect GCP with "${CLIName} config --disconnect GCP or login into GCP CLI."`,
      );
      throw new MeshNotLoggedInError(result.stderr);
    }
  }
}
