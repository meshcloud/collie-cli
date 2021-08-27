import { readFile, writeFile } from "../commands/io.ts";
import { dirname, ensureDir, join } from "../deps.ts";
import { parseJsonWithLog } from "../json.ts";
import { isWindows } from "../os.ts";

function getConfigPath(): string {
  const path = join(".config", "collie-cli");
  let home = "";
  if (isWindows) {
    home = Deno.env.get("APPDATA") || "";
  } else {
    home = Deno.env.get("HOME") || "";
  }
  return join(home, path);
}

export const configPath = getConfigPath();
export const configFilePath = join(configPath, "config.json");
// Use the CLI Name when mentioning it somewhere in a sentence, e.g.: Have fun using ${CLIName}!
export const CLIName = "Collie";
// Use the CLI Command when mentioning it as a command to run, e.g.: Please run "${CLICommand} -h" to see more.
// Don't forget to put quotes ("") around a command to make it clear what exact part of the sentence is the command.
export const CLICommand = CLIName.toLowerCase();
export const GitHubUrl = "https://github.com/meshcloud/collie-cli";

export interface Config {
  connected: ConnectedConfig;
  cache: CacheConfig;
  azure: {
    parentManagementGroups: string[];
  };
  aws: {
    selectedProfile?: string;
  };
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
  azure: {
    parentManagementGroups: [],
  },
  aws: {},
};

export function loadConfig(): Config {
  const config = parseJsonWithLog<Config>(readFile(configFilePath));

  return Object.assign(emptyConfig, config);
}

export async function writeConfig(config: Config) {
  await ensureDir(dirname(configFilePath));
  writeFile(configFilePath, JSON.stringify(config, null, 2));
}
