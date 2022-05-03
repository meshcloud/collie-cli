import { Command } from "../../deps.ts";
import { TenantIamPresenterFactory } from "../../presentation/tenant-iam-presenter-factory.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";

interface IamCommandOptions extends CmdGlobalOptions {
  includeAncestors: boolean;
}

export function registerIamCommand(program: Command) {
  program
    .command("iam <foundation>")
    .description(
      "View all IAM assets applied per tenant. This includes users, groups and technical users that are directly assigned to the tenant.",
    )
    .option(
      "--include-ancestors [includeAncestors:boolean]",
      "Shows the IAM Role Assignments inherited from an ancestor level as well (Azure Management Groups & Root, GCP Folders & Organizations)",
    )
    .action(listIamAction);
}

async function listIamAction(
  options: CmdGlobalOptions & TenantCommandOptions & IamCommandOptions,
  foundation: string,
) {
  const { meshAdapter, tableFactory, queryStatistics } =
    await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  // todo: include query statistics in presenter
  new TenantIamPresenterFactory(tableFactory)
    .buildPresenter(options.output, options.includeAncestors, allTenants)
    .present();
}
