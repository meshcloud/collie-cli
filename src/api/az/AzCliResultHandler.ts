import {
  AzureErrorCode,
  MeshAzurePlatformError,
  MeshAzureRetryableError,
  MeshNotLoggedInError,
  ProcessRunnerError,
} from "/errors.ts";
import { ProcessResultWithOutput } from "/process/ProcessRunnerResult.ts";
import {
  formatAsShellCommand,
  ProcessRunnerResultHandler,
} from "../../process/ProcessRunnerResultHandler.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";
import { AzCliDetector } from "./AzCliDetector.ts";

export class AzCliResultHandler implements ProcessRunnerResultHandler {
  private readonly errRegexExtensionMissing =
    /ERROR: The command requires the extension (\w+)/;

  private readonly errTooManyRequests = /ERROR: \(429\).*?(\d+) seconds/;
  private readonly errCertInvalid = /ERROR: \(401\) Certificate is not/;
  private readonly errInvalidSubscription =
    /\(422\) Cost Management supports only Enterprise Agreement/;
  private readonly errNotAuthorized = /\((AuthorizationFailed)\)/;

  private readonly errConfigurationNotSet = /is not set/;

  constructor(private readonly detector: AzCliDetector) {}

  async handleError(
    command: string[],
    options: ProcessRunnerOptions,
    error: Error,
  ): Promise<never> {
    // catch all error handling - try checking if its a cli version issue
    await this.detector.tryRaiseInstallationStatusError();

    throw new ProcessRunnerError(command, options, error);
  }

  async handleResult(
    command: string[],
    options: ProcessRunnerOptions,
    result: ProcessResultWithOutput,
  ): Promise<void> {
    // only handle unsuccessful results
    if (result.status.success) {
      return;
    }

    // try and match spefific errors
    if (result.status.code == 2) {
      const errMatch = this.errRegexExtensionMissing.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const missingExtension = errMatch[1];

        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_CLI_MISSING_EXTENSION,
          `Missing the Azure cli extention: ${missingExtension}, please install it first.`,
        );
      }
    }

    if (result.status.code == 1) {
      // Too many requests error
      let errMatch = this.errTooManyRequests.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const delayS = parseInt(errMatch[1]);

        throw new MeshAzureRetryableError(
          AzureErrorCode.AZURE_TOO_MANY_REQUESTS,
          delayS,
        );
      }

      // Strange cert invalid error
      errMatch = this.errCertInvalid.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzureRetryableError(AzureErrorCode.AZURE_CLI_GENERAL, 60);
      }

      errMatch = this.errInvalidSubscription.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_INVALID_SUBSCRIPTION,
          "Subscription cost could not be requested via the Cost Management API",
        );
      }

      errMatch = this.errNotAuthorized.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_UNAUTHORIZED,
          "Request could not be made because the current user is not allowed to access this resource",
        );
      }

      errMatch = this.errConfigurationNotSet.exec(result.stderr);
      if (errMatch && command[1] === "config" && command[2] === "get") {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_CLI_CONFIG_NOT_SET,
          command[3],
        );
      }
    }

    // Detect login error
    if (
      result.stderr.includes("az login") ||
      // There is a possibility that a faulty token returns an unknown status code but contains this as part of the error message.
      // to solve this the user must just perform a new login so we issue this error if we detect this string.
      result.stderr.includes("AADSTS700082")
    ) {
      throw new MeshNotLoggedInError(
        `You are not logged in into Azure CLI. Please login with\n\t${
          formatAsShellCommand(
            ["az", "login"],
            options,
          )
        }`,
      );
    }

    // catch all error handling - try checking if its a cli version issue
    await this.detector.tryRaiseInstallationStatusError();

    throw new ProcessRunnerError(command, options, result);
  }
}
