import { loadConfig } from "../../config/config.model.ts";
import { Command } from "../../deps.ts";
import { verifyCliAvailability } from "../../init.ts";
import { setupLogger } from "../../logger.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { QueryStatistics } from "../../mesh/query-statistics.ts";
import { MeshTableFactory } from "../../presentation/mesh-table-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "../cmd-options.ts";
import { isatty } from "../tty.ts";
import { TenantListPresenterFactory } from "../../presentation/tenant-list-presenter-factory.ts";

export function registerListCommand(program: Command) {
  const listTenants = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .action(listTenantAction);

  program.command("list", listTenants);
}

async function listTenantAction(options: CmdGlobalOptions) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const queryStatistics = new QueryStatistics();
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(
    options,
    queryStatistics,
  );

  const allTenants = await meshAdapter.getMeshTenants();

  const tableFactory = new MeshTableFactory(isatty);

  const presenterFactory = new TenantListPresenterFactory(tableFactory);
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
    queryStatistics,
  );
  presenter.present();
}
