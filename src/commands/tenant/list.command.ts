import { Command } from "../../deps.ts";
import { setupLogger } from "../../logger.ts";
import { QueryStatistics } from "../../mesh/query-statistics.ts";
import { MeshTableFactory } from "../../presentation/mesh-table-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "../cmd-options.ts";
import { isatty } from "../tty.ts";
import { TenantListPresenterFactory } from "../../presentation/tenant-list-presenter-factory.ts";
import { CollieRepository } from "/model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { MeshFoundationAdapterFactory } from "../../mesh/MeshFoundationAdapterFactory.ts";
import { Logger } from "../../cli/Logger.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";

interface TenantListOptions {
  platform: string;
}

export function registerListCommand(program: Command) {
  program
    .command("list <foundation>")
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .option(
      "-p, --platform <platform:string>", // todo: make optional -> deploy all platforms!
      "list tenants for this platform only",
    )
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .action(listTenantAction);
}

export async function listTenantAction(
  options: TenantListOptions & CmdGlobalOptions,
  foundation: string,
) {
  const collieRepo = await CollieRepository.load("./");

  const logger = new Logger(collieRepo, options);

  // todo: unify logging infra

  const foundationRepo = await FoundationRepository.load(
    collieRepo,
    foundation,
  );

  const facadeFactory = new CliApiFacadeFactory(logger);
  const meshAdapterFactory = new MeshFoundationAdapterFactory(
    collieRepo,
    foundationRepo,
    facadeFactory,
  );

  const platforms = options.platform
    ? [foundationRepo.findPlatform(options.platform)]
    : foundationRepo.platforms;

  const queryStatistics = new QueryStatistics();
  const meshAdapter = await meshAdapterFactory.buildMeshAdapter(
    platforms,
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
