import { Command, moment } from "../../deps.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { dateType } from "../custom-types.ts";
import { MeshError } from "../../errors.ts";
import { TenantUsagePresenterFactory } from "../../presentation/tenant-usage-presenter-factory.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
interface ListCostsCommandOptions extends GlobalCommandOptions {
  from: string;
  to: string;
}

export function registerCostCommand(program: Command) {
  program
    .command("cost <foundation:foundation>")
    .description(
      "Gathers the costs of all tenants in a given time interval on a monthly basis. Includes tags as columns when outputting as CSV.",
    )
    .type("date", dateType)
    .option(
      "--from <YYYY-MM-DD:date>",
      "Date from which the price collection should start. Use the format YYYY-MM-DD, e.g. 2021-01-01.",
      { required: true },
    )
    .option(
      "--to <YYYY-MM-DD:date>",
      "Date to which the price date is collected. Use the format YYYY-MM-DD, e.g. 2021-12-31.",
      { required: true },
    )
    .action(listTenantsCostAction);
}

export async function listTenantsCostAction(
  options:
    & GlobalCommandOptions
    & TenantCommandOptions
    & ListCostsCommandOptions,
  foundation: string,
) {
  const { meshAdapter, tableFactory, queryStatistics } =
    await prepareTenantCommand(options, foundation);

  // We create UTC dates because we do not work with time, hence we do not care about timezones.
  const start = moment.utc(options.from).startOf("day").toDate();
  if (isNaN(start.valueOf())) {
    throw new MeshError(
      `You have entered an invalid date for '--from':  ${options.from}`,
    );
  }
  const end = moment.utc(options.to).endOf("day").toDate();
  if (isNaN(start.valueOf())) {
    throw new MeshError(
      `You have entered an invalid date for '--to': ${options.to}`,
    );
  }

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantCosts(allTenants, start, end);

  const presenterFactory = new TenantUsagePresenterFactory(tableFactory);
  // FIXME this now poses a problem. The presenter must only display the asked time range from the exisiting costs.
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
    queryStatistics,
  );
  presenter.present();
}
