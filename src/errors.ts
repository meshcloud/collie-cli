import { InstallationStatus } from "./api/CliFacade.ts";
import { CLICommand } from "./config/config.model.ts";
import { ProcessRunnerOptions } from "./process/ProcessRunnerOptions.ts";
import {
  ProcessResultWithOutput,
  ProcessRunnerResult,
} from "./process/ProcessRunnerResult.ts";
import { formatAsShellCommand } from "./process/ProcessRunnerResultHandler.ts";

// todo: move CLI specific errors into their api modules
// todo: review if we need the CLI_GENERAL error codes
export enum GcpErrorCode {
  GCP_CLI_GENERAL = "GCP_CLI_GENERAL",
  GCP_UNAUTHORIZED = "GCP_UNAUTHORIZED",
}

export enum AwsErrorCode {
  AWS_CLI_GENERAL = "AWS_CLI_GENERAL",
  AWS_UNAUTHORIZED = "AWS_UNAUTHORIZED",
}

export enum AzureErrorCode {
  NOT_LOGGED_IN = "NOT_LOGGED_IN",
  AZURE_UNAUTHORIZED = "AZURE_UNAUTHORIZED",
  AZURE_CLI_GENERAL = "AZURE_CLI_GENERAL",
  AZURE_CLI_CONFIG_NOT_SET = "AZURE_CLI_CONFIG_NOT_SET",
  AZURE_TENANT_IS_NOT_SUBSCRIPTION = "AZURE_TENANT_IS_NOT_SUBSCRIPTION",
  AZURE_TOO_MANY_REQUESTS = "AZURE_TOO_MANY_REQUESTS",
  AZURE_INVALID_SUBSCRIPTION = "AZURE_INVALID_SUBSCRIPTION",
  AZURE_CLI_MISSING_EXTENSION = "AZURE_CLI_MISSING_EXTENSION",
  AZURE_UNKNOWN_PRINCIPAL_TYPE = "AZURE_UNKNOWN_PRINCIPAL_TYPE",
  AZURE_UNKNOWN_PRINCIPAL_ASSIGNMENT_SOURCE =
    "AZURE_UNKNOWN_PRINCIPAL_ASSIGNMENT_SOURCE",
}

export class MeshError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ProcessRunnerError extends MeshError {
  constructor(
    command: string[],
    options: ProcessRunnerOptions,
    result: ProcessRunnerResult | Error,
  ) {
    const details = result instanceof Error ? [result.name, result.message] : [
      `Command exited with code ${result.status.code}`,
      formatStdErr(command[0], result),
    ].filter((x) => !!x);

    const message = [
      `Unexpected error executing "${formatAsShellCommand(command, options)}"`,
      ...details,
      `Run ${CLICommand} with --verbose and --debug flags for more details.`,
    ].join("\n");

    super(message);
  }
}

export class CliInstallationStatusError extends MeshError {
  constructor(
    cli: string,
    status:
      | InstallationStatus.NotInstalled
      | InstallationStatus.UnsupportedVersion,
  ) {
    const cmd = cli;

    switch (status) {
      case InstallationStatus.NotInstalled:
        super(
          `"${cmd}" cli is not installed. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
        break;
      case InstallationStatus.UnsupportedVersion:
        super(
          `"${cmd}" cli is not installed in a supported version. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
        break;
      default:
        super("Invalid CliInstallationStatusError: " + status);
    }
  }
}

export class MeshAzurePlatformError extends MeshError {
  constructor(
    public readonly errorCode: AzureErrorCode,
    public readonly message: string,
  ) {
    super(`MeshAzurePlatformError: ${message}`);
  }
}

export class MeshAzureRetryableError extends MeshAzurePlatformError {
  constructor(
    public readonly errorCode: AzureErrorCode,
    public readonly retryInSeconds: number,
  ) {
    super(
      errorCode,
      `MeshAzureRetryableError: Retry possible in ${retryInSeconds}`,
    );
  }
}

export class MeshGcpPlatformError extends MeshError {
  constructor(
    public readonly errorCode: GcpErrorCode,
    public readonly message: string,
  ) {
    super(`MeshGcpPlatformError: ${message}`);
  }
}

export class MeshAwsPlatformError extends MeshError {
  constructor(
    public readonly errorCode: AwsErrorCode,
    public readonly message: string,
  ) {
    super(`MeshAwsPlatformError: ${message}`);
  }

  // deno-lint-ignore no-explicit-any
  static isInstanceWithErrorCode(e: any, errCode: AwsErrorCode): boolean {
    return e instanceof MeshAwsPlatformError && e.errorCode === errCode;
  }
}

export class MeshNotLoggedInError extends MeshError {
  constructor(public readonly message: string) {
    super(`MeshNotLoggedInError: ${message}`);
  }
}

export class MeshInvalidTagValueError extends MeshError {
  constructor(public readonly message: string) {
    super(`MeshInvalidTagValueError: ${message}`);
  }
}

export class IoError extends MeshError {
  constructor(message: string) {
    super(message);
  }
}

function formatStdErr(cli: string, result: ProcessRunnerResult) {
  const stderr = (result as ProcessResultWithOutput).stderr; // include only stderr - do we want to add sections?,

  const name = `${cli} stderr`;

  return (
    stderr &&
    [`--- BEGIN ${name} ---`, stderr, `--- END ${name} ---`].join("\n")
  );
}
