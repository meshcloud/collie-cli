import { Command } from "../../deps.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { TreeTenantListPresenter } from "../../presentation/tree-tenant-list-presenter.ts";

export function registerTreeCommand(program: Command) {
  program
    .command("tree <foundation:foundation>")
    .description(
      "Returns a tree view of tenants in the platform's resource hierarchy",
    )
    .action(treeTenantAction);
}

export async function treeTenantAction(
  options: TenantCommandOptions & GlobalCommandOptions,
  foundation: string,
) {
  const { meshAdapter } = await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  const presenter = new TreeTenantListPresenter(allTenants);

  presenter.present();
}
