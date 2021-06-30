import { exists, log } from "./deps.ts";
import { askYesNo, readFile } from "./commands/io.ts";
import { ShellRunner } from "./process/shell-runner.ts";
import {
  CLICommand,
  CLIName,
  Config,
  configFilePath,
  emptyConfig,
  PlatformCommand,
  writeConfig,
} from "./config/config.model.ts";
import { MeshPlatform } from "./mesh/mesh-tenant.model.ts";
import { MeshError } from "./errors.ts";
import { parseJsonWithLog } from "./json.ts";

function objectsHaveSameKeys(
  // deno-lint-ignore no-explicit-any
  ref: Record<string, any>,
  // deno-lint-ignore no-explicit-any
  config: Record<string, any>,
  parent?: string,
): boolean {
  const refKeys = Object.keys(ref).sort();
  const configKeys = Object.keys(config).sort();

  // check if keys are not the same
  if (!(JSON.stringify(refKeys) === JSON.stringify(configKeys))) {
    if (parent) {
      log.debug(
        `Config with attribute ${parent} does not match the required one.\nRequired: ${refKeys} but got ${configKeys}`,
      );
    } else {
      log.debug(
        `Root attributes in the config does not match the required one.\n" Required ${refKeys} but got ${configKeys}`,
      );
    }
    return false;
  } else {
    refKeys.forEach((e) => {
      if (typeof ref[e] === "object") {
        return objectsHaveSameKeys(ref[e], config[e], e);
      }
    });
    return true;
  }
}

async function checkCLI(cli: string): Promise<boolean> {
  const shellRunner = new ShellRunner();
  var code = 0;
  try {
    code = (await (shellRunner.run(`${cli} --version`))).code;
  } catch {
    code = -1;
  }
  log.debug(`Exit code for running ${cli} is ${code}`);
  return code === 0;
}

async function getInstalledClis(): Promise<Config> {
  const config: Config = emptyConfig;

  for (const platform in MeshPlatform) {
    const mp = platform as MeshPlatform;
    if (await checkCLI(PlatformCommand[mp])) {
      config.connected[mp] = true;
    }
    log.debug(`CLI ${PlatformCommand[mp]} installed.`);
  }

  return config;
}

async function checkIfConfigExists() {
  const exist = await exists(configFilePath);
  if (!exist) {
    log.info(
      "No configuration file found. I will create one for you :)",
    );
    log.info(
      "... searching for installed cloud CLIs",
    );
    const config = await getInstalledClis();
    const platforms: string[] = [];
    Object.keys(config.connected).forEach((val) => {
      const con = val as MeshPlatform;
      if (config.connected[con]) {
        platforms.push(val);
      }
    });
    const answer = await askYesNo(
      `I see you already have these cloud CLIs installed: ${
        platforms.join(", ")
      }.\nDo you want to connect these to ${CLIName}?`,
    );
    if (answer) {
      await writeConfig(config);
      log.info(
        `Saved your configuration here: ${configFilePath}. Have fun using ${CLIName}!`,
      );
    } else {
      log.info(
        `Ok, we did not connect the cloud CLIs. Run "${CLICommand} config -h" to see how to individually connect a new cloud CLI to ${CLIName}.`,
      );
    }
  }
}

export async function init() {
  // check if config file exists
  if (!(Deno.args[0] === "config")) {
    await checkIfConfigExists();

    // check if config file is valid
    const config = parseJsonWithLog<Config>(readFile(configFilePath));

    if (!objectsHaveSameKeys(emptyConfig, config)) {
      throw new MeshError(
        `Configuration does not match the required format. Please delete the config File at ${configFilePath} and run "${CLICommand} config" again`,
      );
    }

    // check if required CLIs are installed
    if (config.connected.GCP && !await checkCLI(PlatformCommand.GCP)) {
      throw new MeshError(
        `gcloud cli is not installed. Please disconnect platform via "${CLICommand} config -d gcp"`,
      );
    }
    if (config.connected.AWS && !await checkCLI(PlatformCommand.AWS)) {
      throw new MeshError(
        `aws cli is not installed. Please disconnect platform via "${CLICommand} config -d aws"`,
      );
    }
    if (config.connected.Azure && !await checkCLI(PlatformCommand.Azure)) {
      throw new MeshError(
        `azure cli (az) is not installed. Please disconnect platform via "${CLICommand} config -d azure"`,
      );
    }

    if (
      !config.connected.AWS && !config.connected.Azure && !config.connected.GCP
    ) {
      // This handling somehow feels right as no connection somehow should not be an error and continueing
      // execution also does not make much sense so we exit here.
      log.info(
        `You are not connected with any platform. Run "${CLICommand} config" for more information.`,
      );
      Deno.exit(0);
    }
  }
}
