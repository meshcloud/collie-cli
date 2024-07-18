// these need to be types due to https://github.com/microsoft/TypeScript/issues/15300

export type AzCliEnv = {
  /**
   * see https://stackoverflow.com/questions/33137145/can-i-access-multiple-azure-accounts-with-azure-cli-from-the-same-machine-at-sam
   */
  AZURE_CONFIG_DIR?: string;
};

export type GcloudCliEnv = {
  CLOUDSDK_ACTIVE_CONFIG_NAME: string;
};

export type AwsCliEnv = {
  AWS_CONFIG_FILE?: string;
  AWS_PROFILE: string;
  AWS_REGION?: string;
};

export type CustomCliEnv = {
  CUSTOM_CONFIG_FILE?: string;
};

export interface CliToolEnv {
  az?: AzCliEnv;
  aws?: AwsCliEnv;
  gcloud?: GcloudCliEnv;
  custom?: CustomCliEnv;
}
