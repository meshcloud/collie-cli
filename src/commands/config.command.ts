import { Input } from "https://deno.land/x/cliffy@v0.19.2/prompt/input.ts";
import {
  CLICommand,
  CLIName,
  configFilePath,
  configPath,
  ConnectedConfig,
  loadConfig,
  writeConfig,
} from "../config/config.model.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { Command, EnumType, log } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshPlatform } from "../mesh/mesh-tenant.model.ts";
import { CmdGlobalOptions } from "./cmd-options.ts";

type Platform = MeshPlatform[number];
const platform = new EnumType(Object.values(MeshPlatform));

interface CmdConfigOpts extends CmdGlobalOptions {
  connect?: Platform;
  disconnect?: Platform;
}

/**
 * Sets the connected configuration depending on the flags the user provided.
 */
async function changeConnectedConfig(options: CmdConfigOpts, program: Command) {
  if (options.connect || options.disconnect) {
    const config = loadConfig();
    if (options.connect) {
      config.connected[options.connect as keyof ConnectedConfig] = true;
    } else if (options.disconnect) {
      config.connected[options.disconnect as keyof ConnectedConfig] = false;
    }

    // Cache must be invalidated after a connection has happened in order to fetch the latest data.
    // It could obviously be better if we just fetch the missing tenants but then we probably need
    // to design a per platform cache which is actually not super hard to do with the design we have
    // in place.
    const repository = newMeshTenantRepository();
    repository.clearAll();

    await writeConfig(config);
    console.log(`Changed config file in ${configFilePath}`);
  } else {
    program.showHelp();
  }
}

export function registerConfigCmd(program: Command) {
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
    .description(
      `Configure the ${CLIName} CLI.\n${CLIName} places its configuration in '${configPath}'.`,
    )
    .example(
      "Connect to Google Cloud Platform",
      `${CLICommand} config --connect GCP`,
    )
    .example(
      "Disconnect from Google Cloud Platform",
      `${CLICommand} config --disconnect GCP`,
    )
    .action((opts) => configurePlatformsAction(opts, configCmd));

  program.command("config", configCmd);

  const showConfigCmd = new Command()
    .description(
      "Show config.",
    )
    .action(showConfigAction);

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

  const awsSubCmd = new Command().description(
    "Configure AWS related options",
  ).action(setupAwsConfigAction);

  configCmd
    .command("show", showConfigCmd)
    .command("azure", azureSubCmd)
    .command("aws", awsSubCmd);
}

async function setupAwsConfigAction() {
  const config = loadConfig();
  const currentAwsProfile = config.aws.selectedProfile || "<none>";
  console.log(`Your current AWS profile is set to: ${currentAwsProfile}`);
  const newProfile: string = await Input.prompt(
    "Enter your default profile to use (or leave empty for none): ",
  );

  if (newProfile.length === 0) {
    delete config.aws.selectedProfile;
  } else {
    config.aws.selectedProfile = newProfile;
  }

  writeConfig(config);
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

async function configurePlatformsAction(
  options: CmdConfigOpts,
  program: Command,
) {
  setupLogger(options);
  log.debug(`configurePlatformsAction: ${JSON.stringify(options)}`);

  if (Object.keys(options).length === 0) {
    log.info(`Please see "${CLICommand} config -h" for more information.`);
  }

  await changeConnectedConfig(options, program);
}

function showConfigAction() {
  console.log(JSON.stringify(loadConfig(), null, 2));
}
