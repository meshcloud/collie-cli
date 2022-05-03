import {
  AwsErrorCode,
  MeshAwsPlatformError,
  MeshInvalidTagValueError,
  MeshNotLoggedInError,
} from "/errors.ts";
import { CLICommand, CLIName } from "/config/config.model.ts";
import { ProcessResultWithOutput } from "../../process/ShellRunnerResult.ts";
import { ShellRunnerResultHandler } from "../../process/ShellRunnerResultHandler.ts";
import { ShellRunnerOptions } from "../../process/ShellRunnerOptions.ts";

export class AwsCliResultHandler implements ShellRunnerResultHandler {
  private readonly errRegexInvalidTagValue =
    /An error occurred \(InvalidInputException\) when calling the TagResource operation: You provided a value that does not match the required pattern/;

  handleResult(
    command: string[],
    options: ShellRunnerOptions,
    result: ProcessResultWithOutput,
  ): void {
    switch (result.status.code) {
      case 0:
        return;
      case 253:
        throw new MeshNotLoggedInError(
          `You are not correctly logged into AWS CLI. Please verify credentials with "aws config" or disconnect with "${CLICommand} config --disconnect AWS"\n${result.stderr}`,
        );
      case 254:
        if (result.stderr.match(this.errRegexInvalidTagValue)) {
          throw new MeshInvalidTagValueError(
            "You provided an invalid tag value for AWS. Please try again with a different value.",
          );
        } else {
          throw new MeshAwsPlatformError(
            AwsErrorCode.AWS_UNAUTHORIZED,
            `Access to required AWS API calls is not permitted. You must use ${CLIName} from a AWS management account user.\n${result.stderr}`,
          );
        }
      default:
        throw new MeshAwsPlatformError(
          AwsErrorCode.AWS_CLI_GENERAL,
          result.stderr,
        );
    }
  }
}
