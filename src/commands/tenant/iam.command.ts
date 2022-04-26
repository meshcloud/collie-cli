import { loadConfig } from "../../config/config.model.ts";
import { Command } from "../../deps.ts";
import { verifyCliAvailability } from "../../init.ts";
import { setupLogger } from "../../logger.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { MeshTableFactory } from "../../presentation/mesh-table-factory.ts";
import { TenantIamPresenterFactory } from "../../presentation/tenant-iam-presenter-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "../cmd-options.ts";
import { isatty } from "../tty.ts";

interface CmdIamOptions extends CmdGlobalOptions {
  includeAncestors: boolean;
}

export function registerIamCommand(program: Command) {
  program
    .command("iam")
    .type("output", OutputFormatType)
    .description(
      "View all IAM assets applied per tenant. This includes users, groups and technical users that are directly assigned to the tenant."
    )
    .option(
      "--include-ancestors [includeAncestors:boolean]",
      "Shows the IAM Role Assignments inherited from an ancestor level as well (Azure Management Groups & Root, GCP Folders & Organizations)"
    )
    .action(listIamAction);
}

async function listIamAction(options: CmdIamOptions) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  const tableFactory = new MeshTableFactory(isatty);

  new TenantIamPresenterFactory(tableFactory)
    .buildPresenter(options.output, options.includeAncestors, allTenants)
    .present();
}
