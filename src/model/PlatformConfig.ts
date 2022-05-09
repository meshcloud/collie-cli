import { CliToolEnv } from "./CliToolEnv.ts";

export interface PlatformConfigBase {
  name: string; // todo: we need better separation between config and frontmatter here
  cli: CliToolEnv;
}

export interface PlatformConfigAws extends PlatformConfigBase {
  aws: {
    accountId: string;
    accountAccessRole: string;
  };
}

export interface PlatformConfigGcp extends PlatformConfigBase {
  gcp: {
    project: string; // project name
    // todo: billing settings
  };
}

export interface PlatformConfigAzure extends PlatformConfigBase {
  azure: {
    aadTenantId: string;
    subscriptionId: string;
  };
}

export type PlatformConfig =
  | PlatformConfigAws
  | PlatformConfigGcp
  | PlatformConfigAzure;
