import { Command } from "../../deps.ts";

import { CLICommand } from "../../config/config.model.ts";
import { registerListCommand } from "./list.command.ts";
import { registerCostCommand } from "./cost.command.ts";
import { registerCacheCommand } from "./cache.command.ts";
import { registerIamCommand } from "./iam.command.ts";
import { registerTagCommand } from "./tag/tag.command.ts";

export function registerTenantCommand(program: Command) {
  const tenantCmd = new Command();
  registerListCommand(tenantCmd);
  registerCostCommand(tenantCmd);
  registerTagCommand(tenantCmd);
  registerIamCommand(tenantCmd);
  registerCacheCommand(tenantCmd);

  program
    .command("tenant", tenantCmd)
    .description(
      `Work with cloud tenants (AWS Accounts, Azure Subscriptions, GCP Projects)`
    )
    .example(
      "List all tenants across all connected clouds in a table",
      `${CLICommand} tenant list`
    )
    .example(
      "List all costs (including tags) in the first month of 2021 as CSV and export it to a file",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-01-31 -o csv > january_2021.csv`
    )
    .example(
      "List all costs per month (excluding tags) in the first quarter and show as a table",
      `${CLICommand} tenant costs --from 2021-01-01 --to 2021-03-31`
    )
    .action(() => {
      tenantCmd.showHelp();
    });
}
