import { CliDetector } from "./cli-detector.ts";
import {
  CLICommand,
  CLIName,
  configFilePath,
  emptyConfig,
  loadConfig,
  writeConfig,
} from "./config/config.model.ts";
import { Confirm, exists, log } from "./deps.ts";
import { MeshError } from "./errors.ts";
import { MeshPlatform } from "./mesh/mesh-tenant.model.ts";

const detector = new CliDetector();

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

async function checkIfConfigExists() {
  const exist = await exists(configFilePath);
  if (!exist) {
    log.info(
      "No configuration file found. I will create one for you :)",
    );
    log.info(
      "... searching for installed cloud CLIs",
    );

    await writeConfig(emptyConfig);

    const config = await detector.getInstalledClis();
    const platforms: string[] = [];
    Object.keys(config.connected).forEach((val) => {
      const con = val as MeshPlatform;
      if (config.connected[con]) {
        platforms.push(val);
      }
    });
    const answer: boolean = await Confirm.prompt(
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
  if (Deno.args[0] !== "config") {
    await checkIfConfigExists();

    // check if config file is valid
    const config = loadConfig();

    if (!objectsHaveSameKeys(emptyConfig, config)) {
      throw new MeshError(
        `Configuration does not match the required format. Please delete the config File at ${configFilePath} and run "${CLICommand} config" again`,
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

/**
   * Checks the availability of the configured CLIs. If they are missing then the collie run is aborted.
   * Should be checked before a cloud relevant call is initiated.
   */
export async function verifyCliAvailability() {
  await detector.verifyCliAvailability();
}
