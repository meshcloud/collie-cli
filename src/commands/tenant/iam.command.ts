import { CLICommand } from "../../config/config.model.ts";
import { Command } from "../../deps.ts";
import { MeshTenantFilter } from "/mesh/filter/MeshTenantFilter.ts";
import { PrincipalNameMeshTenantFilter } from "/mesh/filter/PrincipalNameMeshTenantFilter.ts";
import { TenantIamPresenterFactory } from "../../presentation/tenant-iam-presenter-factory.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";

interface IamCommandOptions extends CmdGlobalOptions {
  includeAncestors: boolean;
  filter?: {
    principal?: string;
  };
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
    .option(
      "--filter.principal [principal:string]",
      "Include only tenants that have the specified principal assigned",
    )
    .example(
      "List all tenants who have the user john.doe@example.com assigned",
      `${CLICommand} tenant iam <foundation> --filter.principal john.doe@example.com`,
    )
    .action(listIamAction);
}

async function listIamAction(
  options: CmdGlobalOptions & TenantCommandOptions & IamCommandOptions,
  foundation: string,
) {
  const { meshAdapter, tableFactory } = await prepareTenantCommand(
    options,
    foundation,
  );

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  // TODO: consider adding filtering options to all collie tenant queries
  const principal = options.filter?.principal;

  const filters: MeshTenantFilter[] = [
    principal &&
    (new PrincipalNameMeshTenantFilter(
      principal,
      options.includeAncestors,
    ) as MeshTenantFilter),
  ].filter((x): x is MeshTenantFilter => !!x);

  const filteredTenants = allTenants.filter((t) =>
    filters.every((f) => f.filter(t))
  );

  // todo: include query statistics in presenter
  new TenantIamPresenterFactory(tableFactory)
    .buildPresenter(options.output, options.includeAncestors, filteredTenants)
    .present();
}
