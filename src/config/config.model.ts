import { readFile, writeFile } from "../commands/io.ts";
import { dirname, ensureDir, os } from "../deps.ts";

export const configPath = getConfigPath();
export const configFilePath = configPath + "/config.json";

// Use the CLI Name when mentioning it somewhere in a sentence, e.g.: Have fun using ${CLIName}!
export const CLIName = "Collie";
// Use the CLI Command when mentioning it as a command to run, e.g.: Please run "${CLICommand} -h" to see more.
// Don't forget to put quotes ("") around a command to make it clear what exact part of the sentence is the command.
export const CLICommand = CLIName.toLowerCase();
export const GitHubUrl = "https://github.com/meshcloud/collie-cli";

export interface Config {
  connected: ConnectedConfig;
  cache: CacheConfig;
}

export interface CacheConfig {
  evictionDelayHrs: number;
}

export interface ConnectedConfig {
  AWS: boolean;
  GCP: boolean;
  Azure: boolean;
}

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
};

function getConfigPath(): string {
  if (os.default.platform() === "windows") {
    return Deno.env.get("%APPDATA%") + "/.config/meshcloudShepherd";
  } else {
    return Deno.env.get("HOME") + "/.config/meshcloudShepherd";
  }
}

export function loadConfig(): Config {
  return JSON.parse(readFile(configFilePath)) as Config;
}

export async function writeConfig(config: Config) {
  await ensureDir(dirname(configFilePath));
  writeFile(configFilePath, JSON.stringify(config));
}
