import {
  AzureErrorCode,
  MeshAzurePlatformError,
  MeshAzureRetryableError,
  MeshNotLoggedInError,
} from "/errors.ts";
import { CLICommand } from "/config/config.model.ts";
import { ProcessResultWithOutput } from "/process/ShellRunnerResult.ts";
import { ShellRunnerResultHandler } from "../../process/ShellRunnerResultHandler.ts";
import { ShellRunnerOptions } from "../../process/ShellRunnerOptions.ts";

export class AzureCliResultHandler implements ShellRunnerResultHandler {
  private readonly errRegexExtensionMissing =
    /ERROR: The command requires the extension (\w+)/;

  private readonly errTooManyRequests = /ERROR: \(429\).*?(\d+) seconds/;
  private readonly errCertInvalid = /ERROR: \(401\) Certificate is not/;
  private readonly errInvalidSubscription =
    /\(422\) Cost Management supports only Enterprise Agreement/;
  private readonly errNotAuthorized = /\((AuthorizationFailed)\)/;

  handleResult(
    _command: string[],
    _options: ShellRunnerOptions,
    result: ProcessResultWithOutput,
  ): void {
    if (result.status.code == 2) {
      const errMatch = this.errRegexExtensionMissing.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const missingExtension = errMatch[1];

        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_CLI_MISSING_EXTENSION,
          `Missing the Azure cli extention: ${missingExtension}, please install it first.`,
        );
      }

      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        `Error executing Azure CLI: ${result.stdout} - ${result.stderr}`,
      );
    } else if (result.status.code == 1) {
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

      // We encountered an error so we will just throw here.
      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        result.stderr,
      );
    }

    // Detect login error
    if (
      result.stderr.includes("az login") ||
      // There is a possibility that a faulty token returns an unknown status code but contains this as part of the error message.
      // to solve this the user must just perform a new login so we issue this error if we detect this string.
      result.stderr.includes("AADSTS700082")
    ) {
      console.log(
        `You are not logged in into Azure CLI. Please login with "az login" or disconnect with "${CLICommand} config --disconnect Azure".`,
      );
      throw new MeshNotLoggedInError(`"${result.stderr.replace("\n", "")}"`);
    }
  }
}
