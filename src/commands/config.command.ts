import {
  CLICommand,
  CLIName,
  configFilePath,
  emptyConfig,
  loadConfig,
  writeConfig,
} from "../config/config.model.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { Command, EnumType, exists, log } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshPlatform } from "../mesh/mesh-tenant.model.ts";
import { ConfigTableViewGenerator } from "../presentation/config-table-view-generator.ts";
import { MeshTableFactory } from "../presentation/mesh-table-factory.ts";
import { CmdGlobalOptions } from "./cmd-options.ts";
import { readFile, writeFile } from "./io.ts";
import { isatty } from "./tty.ts";

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

    // Cache must be invalidated after a connection has happened in order to fetch the latest data.
    // It could obviously be better if we just fetch the missing tenants but then we probably need
    // to design a per platform cache which is actually not super hard to do with the design we have
    // in place.
    const repository = newMeshTenantRepository();
    repository.clearAll();

    writeFile(configFilePath, JSON.stringify(json));
    log.info(`Changed config file in ${configFilePath}`);
  } else {
    program.showHelp();
  }
}

function showConfig() {
  const viewGenerator = new ConfigTableViewGenerator(loadConfig(), [
    "AWS",
    "GCP",
    "Azure",
  ]);
  // This could be wrapped in a presenter class but because of simplicity reasons
  // that would be a bit overengineering.
  const tableFactory = new MeshTableFactory(isatty);
  const meshTable = tableFactory.buildMeshTable();
  meshTable.draw(viewGenerator);
}
