import { Command } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { CmdGlobalOptions, OutputFormatType } from "./cmd-options.ts";
import { CLICommand, loadConfig } from "../config/config.model.ts";
import { verifyCliAvailability } from "../init.ts";
import { MeshAdapterFactory } from "../mesh/mesh-adapter.factory.ts";
import { MeshTableFactory } from "../presentation/mesh-table-factory.ts";
import { TenantIamPresenterFactory } from "../presentation/tenant-iam-presenter-factory.ts";
import { isatty } from "./tty.ts";

export function registerUserCommand(program: Command) {
  const userCmd = new Command()
    .description(
      `Enables you to list tenants based on a user. Run "${CLICommand} user -h" to see what is possible.`,
    )
    .action(() => {
      userCmd.showHelp();
    });
  program.command("user", userCmd);

  const listUserTenants = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .example(
      "List all tenants who have the user john.doe@example.com assigned.",
      `${CLICommand} user list email=john.doe@example.com`,
    )
    .action(listTenantAction);

  userCmd
    .command("list <filter:string>", listUserTenants);
}

async function listTenantAction(options: CmdGlobalOptions, filter: string) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  const tableFactory = new MeshTableFactory(isatty);
  const iamPresenterFactory = new TenantIamPresenterFactory(tableFactory);

  console.log(filter);

  iamPresenterFactory.buildPresenter(
    options.output,
    false, // make this configurable
    allTenants,
  ).present();
}
