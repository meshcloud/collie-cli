import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TreeTenantListPresenter } from "../../presentation/tree-tenant-list-presenter.ts";
import { TenantCommand } from "./TenantCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";

export function registerTreeCommand(program: TenantCommand) {
  program
    .command("tree [foundation:foundation]")
    .description(
      "Returns a tree view of tenants in the platform's resource hierarchy",
    )
    .action(treeTenantAction);
}

export async function treeTenantAction(
  options: GlobalCommandOptions,
  foundationArg: string | undefined,
) {
  const repo = await CollieRepository.load();
  const logger = new Logger(repo, options);

  const foundation = foundationArg ||
    CollieConfig.getFoundation(logger) ||
    (await InteractivePrompts.selectFoundation(repo, logger));

  const { meshAdapter } = await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  const presenter = new TreeTenantListPresenter(allTenants);

  presenter.present();
}
