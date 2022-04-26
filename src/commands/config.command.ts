import { AwsPostPlatformConfigHook } from "../config/aws-post-platform-config-hook.ts";
import {
  CLICommand,
  CLIName,
  configFilePath,
  configPath,
  ConnectedConfig,
  ConnectedConfigKey,
  loadConfig,
  writeConfig,
} from "../config/config.model.ts";
import { GcpPostPlatformConfigHook } from "../config/gcp-post-platform-config-hook.ts";
import { buildConfigHooks } from "../config/post-config-hooks.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { Command, EnumType } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshPlatform } from "../mesh/mesh-tenant.model.ts";
import { ShellRunner } from "../process/shell-runner.ts";
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
  const config = loadConfig();

  if (!options.connect && !options.disconnect) {
    program.showHelp();
    return;
  }

  // Prepare the hooks.
  const hooks = buildConfigHooks();

  if (options.connect) {
    const key = options.connect as ConnectedConfigKey;
    config.connected[key] = true;

    console.debug("Config before hooks:\n" + JSON.stringify(config, null, 2));

    const executableHandler = hooks.filter((h) => h.isExecutable(key));
    for (const h of executableHandler) {
      await h.executeConnected(config);
    }

    console.debug("Config after hooks:\n" + JSON.stringify(config, null, 2));
  }

  if (options.disconnect) {
    const key = options.disconnect as keyof ConnectedConfig;
    config.connected[key] = false;

    console.debug("Config before hooks:\n" + JSON.stringify(config, null, 2));

    const executableHandler = hooks.filter((h) => h.isExecutable(key));
    for (const h of executableHandler) {
      await h.executeDisconnected(config);
    }

    console.debug("Config after hooks:\n" + JSON.stringify(config, null, 2));
  }

  // Cache must be invalidated after a connection has happened in order to fetch the latest data.
  // It could obviously be better if we just fetch the missing tenants but then we probably need
  // to design a per platform cache which is actually not super hard to do with the design we have
  // in place.
  const repository = newMeshTenantRepository();
  repository.clearAll();

  await writeConfig(config);
  console.log(`Changed config file in ${configFilePath}`);
}

export function registerConfigCommand(program: Command) {
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

  const awsSubCmd = new Command().description(
    "Configure AWS related options",
  ).action(setupAwsConfigAction);

  const gcpSubCmd = new Command().description(
    "Configure GCP related options",
  ).action(setupGcpConfigAction);

  configCmd
    .command("show", showConfigCmd)
    .command("aws", awsSubCmd)
    .command("gcp", gcpSubCmd);
}

async function setupAwsConfigAction(options: CmdConfigOpts) {
  setupLogger(options);

  const config = loadConfig();

  // Only allow AWS config if AWS is also connected.
  if (!config.connected.AWS) {
    console.log(
      `AWS CLI is not connected. To connect it execute '${CLICommand} config -c AWS'`,
    );
  }

  delete config.aws.selectedProfile;
  delete config.aws.accountAccessRole;

  const shellRunner = new ShellRunner();
  const awsPostConfig = new AwsPostPlatformConfigHook(shellRunner);
  await awsPostConfig.executeConnected(config);

  writeConfig(config);
}

async function setupGcpConfigAction() {
  const config = loadConfig();

  // Only allow AWS config if AWS is also connected.
  if (!config.connected.GCP) {
    console.log(
      `GCP CLI is not connected. To connect it execute '${CLICommand} config -c GCP'`,
    );
  }

  delete config.gcp?.billingExport;

  const shellRunner = new ShellRunner();
  const gcpPostConfig = new GcpPostPlatformConfigHook(shellRunner);
  await gcpPostConfig.executeConnected(config);

  writeConfig(config);
}

async function configurePlatformsAction(
  options: CmdConfigOpts,
  program: Command,
) {
  setupLogger(options);
  console.debug(`configurePlatformsAction: ${JSON.stringify(options)}`);

  if (Object.keys(options).length === 0) {
    console.log(`Please see "${CLICommand} config -h" for more information.`);
  }

  await changeConnectedConfig(options, program);
}

function showConfigAction() {
  console.log(JSON.stringify(loadConfig(), null, 2));
}
