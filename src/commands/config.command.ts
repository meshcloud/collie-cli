import {
  CLICommand,
  CLIName,
  configFilePath,
  emptyConfig,
  loadConfig,
  writeConfig,
} from "../config/config.model.ts";
import { Command, EnumType, exists, log } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshPlatform } from "../mesh/mesh-tenant.model.ts";
import { CmdGlobalOptions } from "./cmd-options.ts";
import { readFile, writeFile } from "./io.ts";
import { ConfigTableView } from "../presentation/config-table-view.ts";

type Platform = MeshPlatform[number];
const platform = new EnumType(Object.values(MeshPlatform));

interface CmdConfigOpts extends CmdGlobalOptions {
  connect?: Platform;
  disconnect?: Platform;
}

export function registerConfigCmd(program: Command) {
  const connectCmd = new Command()
    .type("platform", platform)
    .option(
      "-c, --connect [platform:platform]",
      `Connect ${CLIName} with enterprise cloud.`,
    )
    .option(
      "-d, --disconnect [platform:platform]",
      `Disconnect ${CLIName} from a specific enterprise cloud.`,
    )
    .description(`Configure the ${CLIName} CLI.`)
    .example(
      "Connect to Google Cloud Platform",
      `${CLICommand} config --connect GCP`,
    )
    .example(
      "Disconnect from Google Cloud Platform",
      `${CLICommand} config --disconnect GCP`,
    )
    .action(configurePlatforms);

  program.command("config", connectCmd);

  const listCmd = new Command()
    .description(
      "Show config.",
    )
    .action(showConfig);

  const setupAzureManagementGroupCmd = new Command()
    .arguments("<management_group_id:string>")
    .description(
      "Setup a parent Management Group in Azure for all your Subscriptions to query. This will speed up price collection because an optimized query can be used.",
    )
    .example(
      "Set a parent management group ID",
      `${CLICommand} config azure managementgroup set 4a2ef91d-7697-4759-ab36-0f8049d274df`,
    )
    .action(setupAzureManagementGroup);

  const azureSubCmd = new Command().description(
    "Configure Azure related options",
  ).command("managementgroup", setupAzureManagementGroupCmd);

  connectCmd
    .command("list", listCmd)
    .command("azure", azureSubCmd);
}

function setupAzureManagementGroup(
  options: CmdConfigOpts,
  managementGroupId: string,
) {
  setupLogger(options);

  const config = loadConfig();
  config.azure.parentManagementGroups = [managementGroupId];
  writeConfig(config);
  log.info(`Set Azure root management group ID to: ${managementGroupId}`);
}

function configurePlatforms(options: CmdConfigOpts, program: Command) {
  setupLogger(options);
  log.debug(`configurePlatforms: ${JSON.stringify(options)}`);

  if (Object.keys(options).length === 0) {
    log.info(`Please see "${CLICommand} config -h" for more information.`);
  }
  exists(configFilePath).then(async (ex) => {
    if (!ex) {
      await writeConfig(emptyConfig);
    }
    changeConfig(options, program);
  });
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

function showConfig() {
  new ConfigTableView(loadConfig(), ["AWS", "GCP", "Azure"]).draw();
}
