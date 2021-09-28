import { bold, Command } from '../deps.ts';
import { CmdGlobalOptions } from './cmd-options.ts';
import { CLICommand, loadConfig } from '../config/config.model.ts';
import { setupLogger } from '../logger.ts';
import { verifyCliAvailability } from '../init.ts';
import { MeshAdapterFactory } from '../mesh/mesh-adapter.factory.ts';
import { MeshTenant } from '../mesh/mesh-tenant.model.ts';

export function registerTagCommand(program: Command) {
  const tagCmd = new Command()
    .description(
      `Work with cloud tenants (AWS Accounts, Azure Subscriptions, GCP Projects) and list all of them, or see tags, costs, and more. Run "${CLICommand} tenant -h" to see what is possible.`,
    )
    .example(
      "List all costs (including tags) in the first month of 2021 as CSV and export it to a file",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-01-31 -o csv > january_2021.csv`,
    )
    .example(
      "Show tenants that are missing the tag 'Environment' and 'CostCenter'",
      `${CLICommand} tenant analyze-tags --details --tags Environment,CostCenter`,
    )
    .action(() => {
      tagCmd.showHelp();
    });

  program.command("tag", tagCmd);

  const analyzeTags = new Command()
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

  tagCmd
    .command("analyze", analyzeTags);
}

interface CmdAnalyzeTagsOptions extends CmdGlobalOptions {
  tags?: string[];
  details?: boolean;
}

async function analyzeTagsAction(options: CmdAnalyzeTagsOptions) {
  setupLogger(options);
  await verifyCliAvailability();

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

  // todo: this does not follow the presenter pattern we usually use
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

export interface AnalyzeTagResult {
  tagName: string;
  percentage: number;
  missingTenants: MeshTenant[];
}