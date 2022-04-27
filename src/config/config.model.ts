import { ensureDir, path } from "../deps.ts";
import { parseJsonWithLog } from "../json.ts";
import { isWindows } from "../os.ts";

function getConfigPath(): string {
  const configPath = path.join(".config", "collie-cli");
  let home = "";
  if (isWindows) {
    home = Deno.env.get("APPDATA") || "";
  } else {
    home = Deno.env.get("HOME") || "";
  }
  return path.join(home, configPath);
}

export const configPath = getConfigPath();
export const configFilePath = path.join(configPath, "config.json");
// Use the CLI Name when mentioning it somewhere in a sentence, e.g.: Have fun using ${CLIName}!
export const CLIName = "Collie";
// Use the CLI Command when mentioning it as a command to run, e.g.: Please run "${CLICommand} -h" to see more.
// Don't forget to put quotes ("") around a command to make it clear what exact part of the sentence is the command.
export const CLICommand = CLIName.toLowerCase();
export const GitHubUrl = "https://github.com/meshcloud/collie-cli";

// This is the name of the materialized view in BigQuery that we use to collect cost data.
export const GcpCostCollectionViewName = "collie_billing_view";

export interface Config {
  connected: ConnectedConfig;
  cache: CacheConfig;
  azure: Record<never, never>;
  aws: {
    selectedProfile?: string;
    accountAccessRole?: string;
  };
  gcp?: {
    // Older versions of Collie might not have this property set up so we need to account for that scenario.
    billingExport?: GcpBillingExportConfig;
  };
}

export interface GcpBillingExportConfig {
  projectId: string;
  datasetName: string;
}

export interface CacheConfig {
  evictionDelayHrs: number;
}

export interface ConnectedConfig {
  AWS: boolean;
  GCP: boolean;
  Azure: boolean;
}

export type ConnectedConfigKey = keyof ConnectedConfig;

export enum PlatformCommand {
  AWS = "aws",
  Azure = "az",
  GCP = "gcloud",
}

export const emptyConfig: Config = {
  connected: {
    AWS: false,
    GCP: false,
    Azure: false,
  },
  cache: {
    evictionDelayHrs: 24,
  },
  azure: {},
  aws: {},
  gcp: {},
};

export function loadConfig(): Config {
  const config = parseJsonWithLog<Config>(
    Deno.readTextFileSync(configFilePath),
  );

  return Object.assign(emptyConfig, config);
}

export async function writeConfig(config: Config) {
  await ensureDir(path.dirname(configFilePath));
  await Deno.writeTextFile(configFilePath, JSON.stringify(config, null, 2));
}
