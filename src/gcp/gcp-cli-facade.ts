import { ShellRunner } from "../process/shell-runner.ts";
import { IamResponse, Project } from "./gcp.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import {
  GcpErrorCode,
  MeshGcpPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { log } from "../deps.ts";
import { CLICommand } from "../config/config.model.ts";
import { parseJsonStdoutWithLog } from "../json.ts";

export class GcpCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}
  private unauthorizedProject = /User is not permitted/;

  async listProjects(): Promise<Project[]> {
    const command = "gcloud projects list --format json";
    const result = await this.shellRunner.run(
      command,
    );
    this.checkForErrors(result);

    log.debug(`listProjects: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog<Project[]>(result, command);
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
        log.warning(
          `Could not list IAM policies for Project ${project.projectId}: Access was denied`,
        );
      }
      return Promise.resolve([]);
    }

    log.debug(`listIamPolicy: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog<IamResponse[]>(result, command);
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
        log.info(
          `You are not logged in into GCP CLI. Please disconnect GCP with "${CLICommand} config --disconnect GCP or login into GCP CLI."`,
        );
        throw new MeshNotLoggedInError(result.stderr);
      }
    }
  }
}
