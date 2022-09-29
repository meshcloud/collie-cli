import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TreeTenantListPresenter } from "../../presentation/tree-tenant-list-presenter.ts";
import { TenantCommand } from "./TenantCommand.ts";

export function registerTreeCommand(program: TenantCommand) {
  program
    .command("tree <foundation:foundation>")
    .description(
      "Returns a tree view of tenants in the platform's resource hierarchy",
    )
    .action(treeTenantAction);
}

export async function treeTenantAction(
  options: GlobalCommandOptions,
  foundation: string,
) {
  const { meshAdapter } = await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  const presenter = new TreeTenantListPresenter(allTenants);

  presenter.present();
}
