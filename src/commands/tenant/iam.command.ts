import { CLI } from "/info.ts";
import { MeshTenantFilter } from "/mesh/filter/MeshTenantFilter.ts";
import { PrincipalNameMeshTenantFilter } from "/mesh/filter/PrincipalNameMeshTenantFilter.ts";
import { TenantIamPresenterFactory } from "../../presentation/tenant-iam-presenter-factory.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { OutputOptions, TenantCommand } from "./TenantCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";

interface IamCommandOptions extends OutputOptions, GlobalCommandOptions {
  includeAncestors?: boolean;
  filter?: {
    principal?: string;
  };
}

export function registerIamCommand(program: TenantCommand) {
  program
    .command("iam [foundation:foundation]")
    .description(
      "View all IAM assets applied per tenant. This includes users, groups and technical users that are directly assigned to the tenant.",
    )
    .option("-o, --output <output:output>", "Defines the output format", {
      default: OutputFormat.TABLE,
    })
    .option(
      "--include-ancestors <includeAncestors:boolean>",
      "Shows the IAM Role Assignments inherited from an ancestor level as well (Azure Management Groups & Root, GCP Folders & Organizations)",
    )
    .option(
      "--filter.principal <principal:string>",
      "Include only tenants that have the specified principal assigned",
    )
    .example(
      "List all tenants who have the user john.doe@example.com assigned",
      `${CLI} tenant iam [foundation:foundation] --filter.principal john.doe@example.com`,
    )
    .action(listIamAction);
}

async function listIamAction(
  options: GlobalCommandOptions & TenantCommandOptions & IamCommandOptions,
  foundationArg: string | undefined,
) {
  const repo = await CollieRepository.load();
  const logger = new Logger(repo, options);

  const foundation = foundationArg ||
    CollieConfig.getFoundation(logger) ||
    (await InteractivePrompts.selectFoundation(repo, logger));

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
      !!options.includeAncestors,
    ) as MeshTenantFilter),
  ].filter((x): x is MeshTenantFilter => !!x);

  const filteredTenants = allTenants.filter((t) =>
    filters.every((f) => f.filter(t))
  );

  // todo: include query statistics in presenter
  new TenantIamPresenterFactory(tableFactory)
    .buildPresenter(options.output, !!options.includeAncestors, filteredTenants)
    .present();
}
