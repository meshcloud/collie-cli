import { CLI } from "/info.ts";
import { registerListCommand } from "./list.command.ts";
import { registerCostCommand } from "./cost.command.ts";
import { registerIamCommand } from "./iam.command.ts";
import { registerAnalyzeTagCommand } from "./analyze-tag.command.ts";
import { registerSetMissingTagCommand } from "./set-missing-tag.command.ts";
import { registerTreeCommand } from "./tree.command.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { makeTenantCommand } from "./TenantCommand.ts";

export function registerTenantCommand(program: TopLevelCommand) {
  const tenantCmd = makeTenantCommand();

  registerListCommand(tenantCmd);
  registerTreeCommand(tenantCmd);
  registerCostCommand(tenantCmd);
  registerIamCommand(tenantCmd);
  registerAnalyzeTagCommand(tenantCmd);
  registerSetMissingTagCommand(tenantCmd);

  program
    .command("tenant", tenantCmd)
    .description(
      `List tenants in your cloud foundations and manage tags, cost and IAM`,
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
