import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TenantListPresenterFactory } from "../../presentation/tenant-list-presenter-factory.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { OutputOptions, TenantCommand } from "./TenantCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";

export function registerListCommand(program: TenantCommand) {
  program
    .command("list [foundation:foundation]")
    .option("-o, --output <output:output>", "Defines the output format", {
      default: OutputFormat.TABLE,
    })
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .action(listTenantAction);
}

export async function listTenantAction(
  options: TenantCommandOptions & GlobalCommandOptions & OutputOptions,
  foundationArg: string | undefined,
) {
  const repo = await CollieRepository.load();
  const logger = new Logger(repo, options);

  const foundation = foundationArg ||
    CollieConfig.getFoundation(logger) ||
    (await InteractivePrompts.selectFoundation(repo, logger));

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
