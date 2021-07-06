export enum GcpErrorCode {
  GCP_CLI_GENERAL = "GCP_CLI_GENERAL",
  GCP_UNAUTHORIZED = "GCP_UNAUTHORIZED",
}

export enum AwsErrorCode {
  AWS_CLI_GENERAL = "AWS_CLI_GENERAL",
}

export enum AzureErrorCode {
  NOT_LOGGED_IN = "NOT_LOGGED_IN",
  AZURE_UNAUTHORIZED = "AZURE_UNAUTHORIZED",
  AZURE_CLI_GENERAL = "AZURE_CLI_GENERAL",
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
}

export class MeshNotLoggedInError extends MeshError {
  constructor(
    public readonly message: string,
  ) {
    super(`MeshNotLoggedInError: ${message}`);
  }
}
