import { log } from "./deps.ts";
import { checkIfConfigExists } from "./commands/config.command.ts";
import { readFile } from "./commands/io.ts";
import { ShellRunner } from "./process/shell-runner.ts";
import {
  CLICommand,
  Config,
  configFilePath,
  emptyConfig,
  PlatformCommand,
} from "./config/config.model.ts";

export async function init() {
  // check if config file exists
  if (!(Deno.args[0] === "config")) {
    await checkIfConfigExists();

    // check if config file is valid
    const config = JSON.parse(readFile(configFilePath)) as Config;
    if (!objectsHaveSameKeys(emptyConfig, config)) {
      log.error(
        `Configuration does not match the required format. Please delete the config File at ${configFilePath} and run "${CLICommand} config" again`,
      );
      Deno.exit(1);
    }
    // check if required CLIs are installed
    if (config.connected.GCP) {
      const ex = await checkCLI(PlatformCommand.GCP);
      if (!ex) {
        log.info(`gcloud cli is not installed. Please disconnect platform.`);
        Deno.exit(1);
      }
    }
    if (config.connected.AWS) {
      const ex = await checkCLI(PlatformCommand.AWS);
      if (!ex) {
        log.info(`aws cli is not installed. Please disconnect platform.`);
        Deno.exit(1);
      }
    }
    if (config.connected.Azure) {
      const ex = await checkCLI(PlatformCommand.Azure);
      if (!ex) {
        log.info(
          `azure cli (az) is not installed. Please disconnect platform.`,
        );
        Deno.exit(1);
      }
    }

    if (
      !config.connected.AWS && !config.connected.Azure && !config.connected.GCP
    ) {
      log.info(
        `You are not connected with any platform. Run "${CLICommand} config" for more information.`,
      );
      Deno.exit(0);
    }
  }
}

function objectsHaveSameKeys(
  // deno-lint-ignore no-explicit-any
  ref: Record<string, any>,
  // deno-lint-ignore no-explicit-any
  config: Record<string, any>,
  parent?: string,
) {
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
    Deno.exit(1);
  } else {
    refKeys.forEach((e) => {
      if (typeof ref[e] === "object") {
        return objectsHaveSameKeys(ref[e], config[e], e);
      }
    });
    return true;
  }
}

export async function checkCLI(cli: string): Promise<boolean> {
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
