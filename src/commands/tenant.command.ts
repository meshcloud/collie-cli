import { Command, moment } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshAdapterFactory } from "../mesh/mesh-adapter.factory.ts";
import { TenantListPresenterFactory } from "../presentation/tenant-list-presenter-factory.ts";
import { TenantUsagePresenterFactory } from "../presentation/tenant-usage-presenter-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "./cmd-options.ts";
import { dateType } from "./custom-types.ts";
import { TenantIamPresenterFactory } from "../presentation/tenant-iam-presenter-factory.ts";
import { CLICommand, loadConfig } from "../config/config.model.ts";
import { isatty } from "./tty.ts";
import { MeshTableFactory } from "../presentation/mesh-table-factory.ts";
import { verifyCliAvailability } from "../init.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";
import { MeshError } from "../errors.ts";

interface CmdListCostsOptions extends CmdGlobalOptions {
  from: string;
  to: string;
}

interface CmdIamOptions extends CmdGlobalOptions {
  includeAncestors: boolean;
}

export function registerTenantCommand(program: Command) {
  const tenantCmd = new Command()
    .description(
      `Work with cloud tenants (AWS Accounts, Azure Subscriptions, GCP Projects) and list all of them, or see tags, costs, and more. Run "${CLICommand} tenant -h" to see what is possible.`,
    )
    .example(
      "List all tenants across all connected clouds in a table",
      `${CLICommand} tenant list`,
    )
    .example(
      "List all costs (including tags) in the first month of 2021 as CSV and export it to a file",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-01-31 -o csv > january_2021.csv`,
    )
    .example(
      "List all costs per month (excluding tags) in the first quarter and show as a table",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-03-31`,
    )
    .action(() => {
      tenantCmd.showHelp();
    });
  program.command("tenant", tenantCmd);

  const listTenants = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Returns a list of tenants with their name, id, tags and platform.",
    )
    .action(listTenantAction);

  const listCosts = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
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

  // Remove this command after a few releases
  // We keep it here for now so we can inform users about the rename.
  const analyzeTags = new Command()
    .description(
      `(Renamed) Please use "${CLICommand} tag analyze-missing" instead.`,
    )
    .action(() => {
      console.log(
        `This command has been renamed and can be used via "${CLICommand} tag analyze-missing". Please use this command instead`,
      );
    });

  const listIam = new Command()
    .type("output", OutputFormatType)
    .description(
      "View all IAM assets applied per tenant. This includes users, groups and technical users that are directly assigned to the tenant.",
    )
    .option(
      "--include-ancestors [includeAncestors:boolean]",
      "Shows the IAM Role Assignments inherited from an ancestor level as well (Azure Management Groups & Root, GCP Folders & Organizations)",
    )
    .action(listIamAction);

  tenantCmd
    .command("list", listTenants)
    .command("costs", listCosts)
    .command("iam", listIam)
    .command("analyze-tags", analyzeTags);
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

async function listIamAction(options: CmdIamOptions) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantRoleAssignments(allTenants);

  const tableFactory = new MeshTableFactory(isatty);

  new TenantIamPresenterFactory(tableFactory)
    .buildPresenter(
      options.output,
      options.includeAncestors,
      allTenants,
    )
    .present();
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
