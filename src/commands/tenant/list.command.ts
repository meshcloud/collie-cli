import { Command } from "../../deps.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TenantListPresenterFactory } from "../../presentation/tenant-list-presenter-factory.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { OutputFormat } from "../../presentation/output-format.ts";

export function registerListCommand(program: Command) {
  program
    .command("list <foundation:foundation>")
    .option("-o --output [output:output]", "Defines the output format", {
      default: OutputFormat.TABLE,
    })
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .action(listTenantAction);
}

export async function listTenantAction(
  options: TenantCommandOptions & GlobalCommandOptions,
  foundation: string,
) {
  const { meshAdapter, tableFactory, queryStatistics } =
    await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  const presenterFactory = new TenantListPresenterFactory(tableFactory);
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
    queryStatistics,
  );

  presenter.present();
}
