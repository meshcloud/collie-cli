import {
  GcpErrorCode,
  MeshGcpPlatformError,
  MeshInvalidTagValueError,
  MeshNotLoggedInError,
} from "/errors.ts";
import { CLICommand } from "/config/config.model.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "../../process/ProcessRunnerResultHandler.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export class GcloudCliResultHandler implements ProcessRunnerResultHandler {
  private unauthorizedProject = /User is not permitted/;
  private invalidTagValue =
    /ERROR: \(gcloud.alpha.projects.update\) argument --update-labels: Bad value/;

  handleResult(
    command: string[],
    options: ProcessRunnerOptions,
    result: ProcessResultWithOutput,
  ): void {
    if (result.status.code === 2) {
      if (this.invalidTagValue.exec(result.stderr)) {
        throw new MeshInvalidTagValueError(
          "You provided an invalid tag value for GCP. Please try again with a different value.",
        );
      } else {
        throw new MeshGcpPlatformError(
          GcpErrorCode.GCP_CLI_GENERAL,
          result.stderr,
        );
      }
    } else if (result.status.code === 1) {
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
