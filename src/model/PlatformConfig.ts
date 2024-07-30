import { CliToolEnv } from "./CliToolEnv.ts";
import { CollieCacheConfig } from "./CollieCacheConfig.ts";

export interface PlatformConfigBase {
  id: string;
  name: string;
  cli?: CliToolEnv;
  collie?: {
    cache?: CollieCacheConfig;
  };
}

type AwsConfig = {
  aws: {
    accountId: string;
    accountAccessRole: string;
  };
};

export type PlatformConfigAws = PlatformConfigBase & AwsConfig;

type GcpConfig = {
  gcp: {
    organization: string;
    project: string; // project name
    billingExport?: {
      project: string;
      dataset: string;
      view: string;
    };
  };
};

export type PlatformConfigGcp = PlatformConfigBase & GcpConfig;

type AzureConfig = {
  azure: {
    aadTenantId: string;
    subscriptionId: string;
  };
};
export type PlatformConfigAzure = PlatformConfigBase & AzureConfig;

type CustomConfig = {
  type: string;
};

export type PlatformConfigCustom = PlatformConfigBase & CustomConfig;

export type PlatformConfig =
  | PlatformConfigAws
  | PlatformConfigGcp
  | PlatformConfigAzure
  | PlatformConfigCustom;

/**
 * The frontmatter stored in a foundation/x/platforms/y/README.md file
 */

export type PlatformFrontmatter =
  & {
    name?: string;
    cli?: CliToolEnv;
  }
  & Partial<AwsConfig>
  & Partial<GcpConfig>
  & Partial<AzureConfig>;

export function configToFrontmatter(
  config: PlatformConfig,
): PlatformFrontmatter {
  const frontmatter: PlatformFrontmatter & { id?: string } = { ...config };

  delete frontmatter.id;

  return frontmatter;
}
