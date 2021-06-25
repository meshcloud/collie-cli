import {
  CLICommand,
  CLIName,
  Config,
  configFilePath,
  emptyConfig,
  PlatformCommand,
} from "../config/config.model.ts";
import { Command, dirname, ensureDir, EnumType, exists, log } from "../deps.ts";
import { checkCLI } from "../init.ts";
import { setupLogger } from "../logger.ts";
import { MeshPlatform } from "../mesh/mesh-tenant.model.ts";
import { CmdGlobalOptions } from "./cmd-options.ts";
import { askYesNo, readFile, writeFile } from "./io.ts";
import { ConfigTableView } from "../presentation/config-table-view.ts";

type Platform = MeshPlatform[number];
const platform = new EnumType(Object.values(MeshPlatform));

interface CmdConfigOpts extends CmdGlobalOptions {
  connect?: Platform;
  disconnect?: Platform;
}

export function registerConfigCmd(program: Command) {
  const listCmd = new Command()
    .description(
      "Show config.",
    )
    .action(showConfig);

  const configCmd = new Command()
    .type("platform", platform)
    .option(
      "-c, --connect [platform:platform]",
      `Connect ${CLIName} with enterprise cloud.`,
    )
    .option(
      "-d, --disconnect [platform:platform]",
      `Disconnect ${CLIName} from a specific enterprise cloud.`,
    )
    .description(`Configure ${CLIName} CLI.`)
    .example(
      "Connect to Google Cloud Platform",
      `${CLICommand} config --connect GCP`,
    )
    .example(
      "Disconnect from Google Cloud Platform",
      `${CLICommand} config --disconnect GCP`,
    )
    .action(async (options: CmdConfigOpts) => {
      await config(options, configCmd);
    });

  program
    .command("config", configCmd.command("list", listCmd));
}

function config(options: CmdConfigOpts, program: Command) {
  setupLogger(options);

  if (Object.keys(options).length === 0) {
    log.info(`Please see "${CLICommand} config -h" for more information.`);
  }
  exists(configFilePath).then(async (ex) => {
    if (!ex) {
      await writeConfig(emptyConfig);
    }
    changeConfig(options, program);
  });
  log.debug(`Passed Options: ${JSON.stringify(options)}`);
}

async function writeConfig(config: Config) {
  await ensureDir(dirname(configFilePath));
  writeFile(configFilePath, JSON.stringify(config));
}

function changeConfig(options: CmdConfigOpts, program: Command) {
  if (options.connect || options.disconnect) {
    const json = JSON.parse(readFile(configFilePath));
    if (options.connect) {
      json.connected[options.connect] = true;
    } else if (options.disconnect) {
      json.connected[options.disconnect] = false;
    }
    writeFile(configFilePath, JSON.stringify(json));
    log.info(`Changed config file in ${configFilePath}`);
  } else {
    program.showHelp();
  }
}

export async function checkIfConfigExists() {
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
      Deno.exit(0);
    }
  }
}

export function loadConfig(): Config {
  return JSON.parse(readFile(configFilePath)) as Config;
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

function showConfig() {
  new ConfigTableView(loadConfig(), ["AWS", "GCP", "Azure"]).draw();
}
