import {
  GcpErrorCode,
  MeshGcpPlatformError,
  MeshInvalidTagValueError,
  MeshNotLoggedInError,
  ProcessRunnerError,
} from "/errors.ts";
import { CLICommand } from "/config/config.model.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "../../process/ProcessRunnerResultHandler.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";
import { CliDetector } from "../CliDetector.ts";

export class GcloudCliResultHandler implements ProcessRunnerResultHandler {
  private unauthorizedProject = /User is not permitted/;
  private invalidTagValue =
    /ERROR: \(gcloud.alpha.projects.update\) argument --update-labels: Bad value/;

  constructor(private readonly detector: CliDetector) {}

  async handleError(
    command: string[],
    options: ProcessRunnerOptions,
    error: Error,
  ): Promise<never> {
    // catch all error handling - try checking if its a cli version issue
    await this.tryRaiseInstallationStatusError();

    throw new ProcessRunnerError(command, options, error);
  }

  async handleResult(
    command: string[],
    options: ProcessRunnerOptions,
    result: ProcessResultWithOutput,
  ): Promise<void> {
    switch (result.status.code) {
      case 0:
        return;
      case 2:
        if (this.invalidTagValue.exec(result.stderr)) {
          throw new MeshInvalidTagValueError(
            "You provided an invalid tag value for GCP. Please try again with a different value.",
          );
        }
        break;
      case 1:
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

    // catch all error handling - try checking if its a cli version issue
    await this.tryRaiseInstallationStatusError();

    throw new ProcessRunnerError(command, options, result);
  }

  private async tryRaiseInstallationStatusError() {
    await this.detector.tryRaiseInstallationStatusError(
      "gcloud",
      /^Google Cloud SDK/,
    );
  }
}
