import {
  AwsErrorCode,
  MeshAwsPlatformError,
  MeshInvalidTagValueError,
  MeshNotLoggedInError,
  ProcessRunnerError,
} from "/errors.ts";
import { CLI } from "/info.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "../../process/ProcessRunnerResultHandler.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";
import { CliDetector } from "../CliDetector.ts";

export class AwsCliResultHandler implements ProcessRunnerResultHandler {
  private readonly errRegexInvalidTagValue =
    /An error occurred \(InvalidInputException\) when calling the TagResource operation: You provided a value that does not match the required pattern/;

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
      case 253:
        throw new MeshNotLoggedInError(
          `You are not correctly logged into AWS CLI. Please verify credentials with "aws config" or disconnect with "${CLI} config --disconnect AWS"\n${result.stderr}`,
        );
      case 254:
        if (result.stderr.match(this.errRegexInvalidTagValue)) {
          throw new MeshInvalidTagValueError(
            "You provided an invalid tag value for AWS. Please try again with a different value.",
          );
        } else {
          throw new MeshAwsPlatformError(
            AwsErrorCode.AWS_UNAUTHORIZED,
            `Access to required AWS API calls is not permitted. You must use ${CLI} from a AWS management account user.\n${result.stderr}`,
          );
        }
    }
    // catch all error handling - try checking if its a cli version issue
    await this.tryRaiseInstallationStatusError();

    throw new ProcessRunnerError(command, options, result);
  }

  private async tryRaiseInstallationStatusError() {
    await this.detector.tryRaiseInstallationStatusError("aws", /^aws-cli\/2\./);
  }
}
