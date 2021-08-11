import { CliDetector } from "./cli-detector.ts";
import {
  CLICommand,
  CLIName,
  Config,
  configFilePath,
  ConnectedConfigKey,
  emptyConfig,
  loadConfig,
  writeConfig,
} from "./config/config.model.ts";
import { buildConfigHooks } from "./config/post-config-hooks.ts";
import { Confirm, exists, log } from "./deps.ts";
import { MeshError } from "./errors.ts";

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

async function checkIfConfigExists(): Promise<Config> {
  if (await exists(configFilePath)) {
    return loadConfig();
  }

  console.log(
    "No configuration file found. I will create one for you :)",
  );

  await writeConfig(emptyConfig);

  console.log(
    "... searching for installed cloud CLIs",
  );

  const config = await detector.connectInstalledClis(emptyConfig);

  const connectedPlatforms: ConnectedConfigKey[] = [];

  Object.keys(config.connected).forEach((key) => {
    const con = key as ConnectedConfigKey;

    if (config.connected[con]) {
      connectedPlatforms.push(con);
    }
  });

  const shouldConnect: boolean = await Confirm.prompt(
    `I see you already have these cloud CLIs installed: ${
      connectedPlatforms.join(", ")
    }.\nDo you want to connect these to ${CLIName}?`,
  );
  if (shouldConnect) {
    console.log(
      `Saved your configuration here: ${configFilePath}. Have fun using ${CLIName}!`,
    );

    const hooks = buildConfigHooks();
    const availableHooks = connectedPlatforms.flatMap((cp) =>
      hooks.filter((h) => h.isExecutable(cp))
    );

    console.log();

    for (const h of availableHooks) {
      await h.executeConnected(config);
    }

    console.log();

    await writeConfig(config);

    return config;
  } else {
    console.log(
      `Ok, we did not connect the cloud CLIs. Run "${CLICommand} config -h" to see how to individually connect a new cloud CLI to ${CLIName}.`,
    );

    return emptyConfig;
  }
}

export async function init() {
  // check if config file exists
  const config = await checkIfConfigExists();

  // check if config file is valid
  if (!objectsHaveSameKeys(emptyConfig, config)) {
    throw new MeshError(
      `Configuration does not match the required format. Please delete the config File at ${configFilePath} and run "${CLICommand} config" again`,
    );
  }

  const isNoPlatformConnected = !config.connected.AWS &&
    !config.connected.Azure && !config.connected.GCP;
  const isConfigInvoked = Deno.args[0] === "config";

  if (isNoPlatformConnected && !isConfigInvoked) {
    // This handling somehow feels right as no connection somehow should not be an error and continueing
    // execution also does not make much sense so we exit here.
    console.log(
      `You are not connected with any platform. Run "${CLICommand} config" for more information.`,
    );
    Deno.exit(0);
  }
}

/**
   * Checks the availability of the configured CLIs. If they are missing then the collie run is aborted.
   * Should be checked before a cloud relevant call is initiated.
   */
export async function verifyCliAvailability() {
  await detector.verifyCliAvailability();
}
