import { askYesNo } from "./commands/io.ts";
import {
  CLICommand,
  CLIName,
  Config,
  configFilePath,
  emptyConfig,
  loadConfig,
  PlatformCommand,
  writeConfig,
} from "./config/config.model.ts";
import { exists, log } from "./deps.ts";
import { MeshError } from "./errors.ts";
import { MeshPlatform } from "./mesh/mesh-tenant.model.ts";
import { ShellRunner } from "./process/shell-runner.ts";

enum PlatformCommandInstallationStatus {
  Installed,
  UnsupportedVersion,
  NotInstalled,
}

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

async function getInstalledClis(): Promise<Config> {
  const config: Config = emptyConfig;

  for (const platform in MeshPlatform) {
    const mp = platform as MeshPlatform;
    if (await checkCliInstalled(PlatformCommand[mp])) {
      config.connected[mp] = true;
    }
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
  const config = loadConfig();

  // run checks concurrently to improve responsiveness of collie
  // checking a cloud provider cli typically takes ~500ms each (most are implemented in Python), so the speedup
  // we gain from this is significant and perceivable
  const verifications: Promise<void>[] = [];
  for (const platform in MeshPlatform) {
    const promise = verifyConnectedCliInstalled(
      config,
      platform as MeshPlatform,
    );
    verifications.push(promise);
  }

  await Promise.all(verifications);
}

async function verifyConnectedCliInstalled(
  config: Config,
  platform: MeshPlatform,
) {
  const cmd = PlatformCommand[platform];
  if (!config.connected[platform]) {
    return;
  }

  const status = await checkCliInstalled(cmd);
  switch (status) {
    case PlatformCommandInstallationStatus.NotInstalled:
      throw new MeshError(
        `${platform} cloud cli "${cmd}" is not installed. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions or disconnect platform via "${CLICommand} config -d ${platform}".`,
      );
    case PlatformCommandInstallationStatus.UnsupportedVersion:
      throw new MeshError(
        `${platform} cloud cli "${cmd}" is not installed in a supported version. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions or disconnect platform via "${CLICommand} config -d ${platform}".`,
      );
    case PlatformCommandInstallationStatus.Installed:
      log.debug(`CLI ${cmd} is correctly installed.`);
      break;
  }
}

async function checkCliInstalled(
  cli: PlatformCommand,
): Promise<PlatformCommandInstallationStatus> {
  const shellRunner = new ShellRunner();

  try {
    const result = await shellRunner.run(`${cli} --version`);

    if (result.code !== 0) {
      return PlatformCommandInstallationStatus.NotInstalled;
    }

    const regex = supportedCliVersionRegex(cli);
    log.debug(result.stdout);

    return regex.test(result.stdout)
      ? PlatformCommandInstallationStatus.Installed
      : PlatformCommandInstallationStatus.UnsupportedVersion;
  } catch {
    return PlatformCommandInstallationStatus.NotInstalled;
  }
}

function supportedCliVersionRegex(cli: PlatformCommand): RegExp {
  // TODO: maybe this should be part of the CLI facades
  switch (cli) {
    case PlatformCommand.AWS:
      return /^aws-cli\/2\./;
    case PlatformCommand.GCP:
      return /^Google Cloud SDK/;
    case PlatformCommand.Azure:
      return /azure-cli\s+2\./;
  }
}
