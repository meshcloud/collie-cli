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
import { parseJsonWithLog } from "../json.ts";

export class GcpCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}
  private unauthorizedProject = /User is not permitted/;

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

    return JSON.parse(result.stdout) as IamResponse[];
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
          `You are not logged in into GCP CLI. Please login with "gcloud auth login" or disconnect with "${CLICommand} config --disconnect"`,
        );
        throw new MeshNotLoggedInError(result.stderr);
      }
    }
  }
}
