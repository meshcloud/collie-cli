import { moment } from "x/deno_moment";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { dateType } from "../custom-types.ts";
import { MeshError } from "../../errors.ts";
import { TenantUsagePresenterFactory } from "../../presentation/tenant-usage-presenter-factory.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { OutputOptions, TenantCommand } from "./TenantCommand.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { getCurrentWorkingFoundation } from "../../cli/commandOptionsConventions.ts";

interface ListCostsCommandOptions extends GlobalCommandOptions, OutputOptions {
  from: string;
  to: string;
}

export function registerCostCommand(program: TenantCommand) {
  program
    .command("cost [foundation:foundation]")
    .description(
      "Gathers the costs of all tenants in a given time interval on a monthly basis. Includes tags as columns when outputting as CSV.",
    )
    .option("-o, --output <output:output>", "Defines the output format", {
      default: OutputFormat.TABLE,
    })
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
  foundationArg: string | undefined,
) {
  const repo = await CollieRepository.load();
  const logger = new Logger(repo, options);

  const foundation = await getCurrentWorkingFoundation(
    foundationArg,
    logger,
    repo,
  );

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
