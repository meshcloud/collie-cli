export const ErrorCodes = {
  AWS_CLI_GENERAL: "aws_cli_general",
  GCP_CLI_GENERAL: "gcp_cli_general",
};

export type AzureErrorCode =
  | "NOT_LOGGED_IN"
  | "AZURE_CLI_GENERAL"
  | "AZURE_RETRYABLE_ERROR"
  | "AZURE_TOO_MANY_REQUESTS"
  | "AZURE_INVALID_SUBSCRIPTION"
  | "AZURE_CLI_MISSING_EXTENSION";

export class MeshError extends Error {
  constructor(message: string) {
    super(message);
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
    public readonly errorCode: string,
    public readonly message: string,
  ) {
    super(`MeshGcpPlatformError: ${message}`);
  }
}

export class MeshAwsPlatformError extends MeshError {
  constructor(
    public readonly errorCode: string,
    public readonly message: string,
  ) {
    super(`MeshAwsPlatformError: ${message}`);
  }
}

export class MeshNotLoggedInError extends MeshError {
  constructor(
    public readonly message: string,
  ) {
    super(`MeshNotLoggedInError: ${message}`);
  }
}
