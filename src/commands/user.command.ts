import { Command } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { CmdGlobalOptions, OutputFormatType } from "./cmd-options.ts";
import { CLICommand, loadConfig } from "../config/config.model.ts";
import { verifyCliAvailability } from "../init.ts";
import { MeshAdapterFactory } from "../mesh/mesh-adapter.factory.ts";
import { MeshTableFactory } from "../presentation/mesh-table-factory.ts";
import { TenantIamPresenterFactory } from "../presentation/tenant-iam-presenter-factory.ts";
import { isatty } from "./tty.ts";
import { MeshTenantFilterFactory } from "../mesh/filter/mesh-tenant-filter-factory.ts";

export function registerUserCommand(program: Command) {
  const userCmd = new Command()
    .description(
      `View which tenants a user has access to. Run "${CLICommand} user -h" to see what is possible and how it works.`,
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
      "List all tenants who have the user john.doe@example.com assigned",
      `${CLICommand} user list john.doe@example.com`,
    )
    .action(listUserTenantAction);

  userCmd
    .command("list <principalName:string>", listUserTenants);
}

async function listUserTenantAction(
  options: CmdGlobalOptions,
  filterStr: string,
) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  const filterFactory = new MeshTenantFilterFactory();
  const tenantFilter = filterFactory.buildFilterFromString(filterStr);

  const filteredTenants = allTenants.filter((t) => tenantFilter.filter(t));

  const tableFactory = new MeshTableFactory(isatty);
  const iamPresenterFactory = new TenantIamPresenterFactory(tableFactory);

  iamPresenterFactory.buildPresenter(
    options.output,
    true, // we want to see inherited access as well
    filteredTenants,
    filterStr,
  ).present();
}
