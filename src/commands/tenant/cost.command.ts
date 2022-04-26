import { loadConfig } from "../../config/config.model.ts";
import { Command, moment } from "../../deps.ts";
import { verifyCliAvailability } from "../../init.ts";
import { setupLogger } from "../../logger.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { QueryStatistics } from "../../mesh/query-statistics.ts";
import { MeshTableFactory } from "../../presentation/mesh-table-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "../cmd-options.ts";
import { isatty } from "../tty.ts";
import { dateType } from "../custom-types.ts";
import { MeshError } from "../../errors.ts";
import { TenantUsagePresenterFactory } from "../../presentation/tenant-usage-presenter-factory.ts";
interface CmdListCostsOptions extends CmdGlobalOptions {
  from: string;
  to: string;
}

export function registerCostCommand(program: Command) {
  const listCost = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy? replace with https://cliffy.io/docs@v0.23.0/command/types#global-types
    .type("output", OutputFormatType)
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

  program.command("cost", listCost);
}

export async function listTenantsCostAction(options: CmdListCostsOptions) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const queryStatistics = new QueryStatistics();
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(
    options,
    queryStatistics,
  );

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

  // Every of these methods can throw e.g. because a CLI tool was not installed we should think about
  // how to do error management to improve UX.
  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantCosts(allTenants, start, end);

  const tableFactory = new MeshTableFactory(isatty);
  const presenterFactory = new TenantUsagePresenterFactory(tableFactory);
  // FIXME this now poses a problem. The presenter must only display the asked time range from the exisiting costs.
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
    queryStatistics,
  );
  presenter.present();
}
