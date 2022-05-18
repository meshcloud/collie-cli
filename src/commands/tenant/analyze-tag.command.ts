import * as colors from "std/fmt/colors";

import { Command } from "../../deps.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { CLI } from "/info.ts";
import { MeshTenant } from "../../mesh/MeshTenantModel.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";

export function registerAnalyzeTagCommand(program: Command) {
  program
    .command("analyze-tags <foundation:foundation>")
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
    .example(
      "Show tenants that are missing the tag 'Environment' and 'CostCenter'",
      `${CLI} tenant tag analyze-missing --details --tags Environment,CostCenter`,
    )
    .action(analyzeTagsAction);
}
interface AnalyzeTagsCommandOptions extends GlobalCommandOptions {
  tags?: string[];
  details?: boolean;
}

async function analyzeTagsAction(
  options:
    & GlobalCommandOptions
    & TenantCommandOptions
    & AnalyzeTagsCommandOptions,
  foundation: string,
) {
  const { meshAdapter } = await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  let tagList: string[] = [];
  if (options.tags) {
    tagList = options.tags;
  } else {
    tagList = getDistinctTagKeys(allTenants);
  }

  // todo: this does not follow the presenter pattern we usually use
  const totalTenantCount = allTenants.length;
  const result: AnalyzeTagResult[] = [];
  console.log(`We analyzed ${totalTenantCount} tenants for tags.`);
  if (!options.details) {
    console.log(`We found these ${tagList.length} tags: ${tagList.join(", ")}`);
  }
  for (const tag of tagList) {
    let missingTenants = allTenants.filter(
      (x) => !x.tags.find((t) => t.tagName === tag),
    );
    const count = totalTenantCount - missingTenants.length; // A bit weird but this way we only have to .filter() once.
    const percentage = (count / totalTenantCount) * 100;
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
    console.log(
      `${colors.bold(result.tagName)}: ${result.percentage.toFixed(1)}%`,
    );
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

/**
 * Takes an array of tenants and returns a list of distinct tag keys based on all tags that are applied to all tenants.
 *
 * @param tenants
 */
function getDistinctTagKeys(tenants: MeshTenant[]): string[] {
  // Inspired by https://stackoverflow.com/a/35092559/5976604
  return [
    ...new Set(
      tenants.flatMap((tenant) => tenant.tags.map((tag) => tag.tagName)),
    ),
  ];
}
