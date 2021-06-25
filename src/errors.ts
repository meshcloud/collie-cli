export const ErrorCodes = {
  NOT_LOGGED_IN: "not_logged_in",
  AZURE_CLI_GENERAL: "azure_cli_general",
  AZURE_CLI_MISSING_EXTENSION: "azure_cli_missing_extension",
  AWS_CLI_GENERAL: "aws_cli_general",
  GCP_CLI_GENERAL: "gcp_cli_general",
};

export class MeshError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class MeshAzurePlatformError extends MeshError {
  constructor(
    public readonly errorCode: string,
    public readonly message: string,
  ) {
    super(`MeshAzurePlatformError: ${message}`);
  }
}

// TODO we must unify this design. Its getting a bit out of hand here.
export class MeshAzureRetryableError extends MeshError {
  constructor(
    public readonly retryInSeconds: number,
  ) {
    super(
      `MeshAzureRetryableError: Retry possible in ${retryInSeconds}`,
    );
  }
}

export class MeshAzureTooManyRequestsError extends MeshError {
  constructor(
    public readonly retryInSeconds: number,
  ) {
    super(
      `MeshAzureTooManyRequestsError: Retry possible in ${retryInSeconds}`,
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
    public readonly errorCode: string,
    public readonly message: string,
  ) {
    super(`MeshNotLoggedInError: ${message}`);
  }
}
