import { Command } from "../../deps.ts";

import { CLI } from "/info.ts";
import { registerListCommand } from "./list.command.ts";
import { registerCostCommand } from "./cost.command.ts";
import { registerIamCommand } from "./iam.command.ts";
import { registerAnalyzeTagCommand } from "./analyze-tag.command.ts";
import { registerSetMissingTagCommand } from "./set-missing-tag.command.ts";

export function registerTenantCommand(program: Command) {
  const tenantCmd = new Command();

  registerListCommand(tenantCmd);
  registerCostCommand(tenantCmd);
  registerIamCommand(tenantCmd);
  registerAnalyzeTagCommand(tenantCmd);
  registerSetMissingTagCommand(tenantCmd);

  program
    .command("tenant", tenantCmd)
    .description(
      `Work with cloud tenants (AWS Accounts, Azure Subscriptions, GCP Projects)`,
    )
    .globalOption(
      "-p, --platform <platform:string>", // todo: make optional -> deploy all platforms!
      "list tenants for this platform only",
    )
    .globalOption(
      "--refresh", // todo: make optional -> deploy all platforms!
      "force refresh of any cached tenant state",
    )
    .example(
      "List all tenants across all connected clouds in a table",
      `${CLI} tenant list`,
    )
    .example(
      "List all costs (including tags) in the first month of 2021 as CSV and export it to a file",
      `${CLI} tenant costs --from 2021-01-01 --to 2021-01-31 -o csv > january_2021.csv`,
    )
    .example(
      "List all costs per month (excluding tags) in the first quarter and show as a table",
      `${CLI} tenant costs --from 2021-01-01 --to 2021-03-31`,
    )
    .action(() => {
      tenantCmd.showHelp();
    });
}
