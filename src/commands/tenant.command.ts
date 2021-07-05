import { bold, Command, moment } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { MeshAdapterFactory } from "../mesh/mesh-adapter.factory.ts";
import { TenantListPresenterFactory } from "../presentation/tenant-list-presenter-factory.ts";
import { TenantUsagePresenterFactory } from "../presentation/tenant-usage-presenter-factory.ts";
import { CmdGlobalOptions, OutputFormatType } from "./cmd-options.ts";
import { dateType } from "./custom-types.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { TenantIamPresenterFactory } from '../presentation/tenant-iam-presenter-factory.ts';
import { CLICommand, loadConfig } from "../config/config.model.ts";
import { isatty } from "./tty.ts";
import { MeshTableFactory } from "../presentation/mesh-table-factory.ts";

interface CmdListCostsOptions extends CmdGlobalOptions {
  from: string;
  to: string;
}

interface CmdAnalyzeTagsOptions extends CmdGlobalOptions {
  tags?: string[];
  details?: boolean;
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
      "List all tenants across all connected clouds in a table.",
      `${CLICommand} tenant list`,
    )
    .example(
      "List all costs (including tags) in the first month of 2021 as CSV and export it to a file.",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-01-31 -o csv > january_2021.csv`,
    )
    .example(
      "List all costs per month (excluding tags) in the first quarter and show as a table.",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-03-31`,
    )
    .example(
      "Show tenants that are missing the tag 'Environment' and 'CostCenter'",
      `${CLICommand} tenant analyze-tags --details --tags Environment,CostCenter`,
    )
    .action(() => tenantMenu(tenantCmd));
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
      "Date from which the price collection should start",
      { required: true },
    )
    .option(
      "--to <YYYY-MM-DD:date>",
      "Date to which the price date is collected",
      { required: true },
    )
    .action(listTenantsCostAction);

  const analyzeTags = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Analyzes all available tags on tenants and returns the percentage of tenants that make use of this tag.",
    )
    .option(
      "--tags <tags:string[]>",
      "The list of tags to filter on. If not given, all found tags are considered. Example: --tags Environment,Department",
    )
    .option(
      "--details [details:boolean]",
      "Shows more details, including which cloud tenants are missing which tag.",
    )
    .action(analyzeTagsAction);

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
  setupLogger(options);

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);
  const allTenants = await meshAdapter.getMeshTenants();
  const tableFactory = new MeshTableFactory(isatty);

  const presenterFactory = new TenantListPresenterFactory(tableFactory);
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
  );
  presenter.present();
}

async function listIamAction(options: CmdIamOptions) {
  setupLogger(options);

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
  setupLogger(options);

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  // We create UTC dates because we do not work with time, hence we do not care about timezones.
  const start = moment.utc(options.from).startOf("day").toDate();
  const end = moment.utc(options.to).endOf("day").toDate();

  // Every of these methods can throw e.g. because a CLI tool was not installed we should think about
  // how to do error management to improve UX.
  const allTenants = await meshAdapter.getMeshTenants();

  await meshAdapter.attachTenantCosts(
    allTenants,
    start,
    end,
  );

  const tableFactory = new MeshTableFactory(isatty);
  const presenterFactory = new TenantUsagePresenterFactory(tableFactory);
  // FIXME this now poses a problem. The presenter must only display the asked time range from the exisiting costs.
  const presenter = presenterFactory.buildPresenter(
    options.output,
    allTenants,
  );
  presenter.present();
}

async function analyzeTagsAction(options: CmdAnalyzeTagsOptions) {
  setupLogger(options);

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  let tagList: string[] = [];
  if (options.tags) {
    tagList = options.tags;
  } else {
    // https://stackoverflow.com/a/35092559/5976604
    tagList = [
      ...new Set(
        allTenants.flatMap((tenant) => tenant.tags.map((tag) => tag.tagName)),
      ),
    ];
  }

  const totalTenantCount = allTenants.length;
  const result: AnalyzeTagResult[] = [];
  console.log(`We analyzed ${totalTenantCount} tenants for tags.`);
  if (!options.details) {
    console.log(`We found these ${tagList.length} tags: ${tagList.join(", ")}`);
  }
  for (const tag of tagList) {
    let missingTenants = allTenants.filter((x) =>
      !x.tags.find((t) => t.tagName === tag)
    );
    const count = totalTenantCount - missingTenants.length; // A bit weird but this way we only have to .filter() once.
    const percentage = count / totalTenantCount * 100;
    if (!options.details) {
      missingTenants = [];
    }
    result.push({ tagName: tag, missingTenants, percentage });
  }

  result.sort((a, b) => b.percentage - a.percentage);

  displayAnalyzeTagResults(result);

  if (!options.details) {
    console.log(
      "Run this command with --details to see which tenants are missing a certain tag. Additionally use --tags for filtering.",
    );
  }
}

function displayAnalyzeTagResults(results: AnalyzeTagResult[]) {
  for (const result of results) {
    console.log(`${bold(result.tagName)}: ${result.percentage.toFixed(1)}%`);
    if (result.missingTenants.length > 0) {
      console.log("The following tenants are missing this tag:");
      for (const tenant of result.missingTenants) {
        console.log(`└── [${tenant.platform}] ${tenant.platformTenantName}`);
      }
    }
  }
}

function tenantMenu(tenantMenu: Command) {
  tenantMenu.showHelp();
}

export interface AnalyzeTagResult {
  tagName: string;
  percentage: number;
  missingTenants: MeshTenant[];
}
