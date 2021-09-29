import { Command } from "../../deps.ts";
import { CLICommand } from "../../config/config.model.ts";
import { analyzeMissingTags } from "./analyze-missing.command.ts";
import { setMissingTags } from "./set-missing.command.ts";

export function registerTagCommand(program: Command) {
  const tagCmd = new Command()
    .description(
      `Work with cloud tenants (AWS Accounts, Azure Subscriptions, GCP Projects) and list all of them, or see tags, costs, and more. Run "${CLICommand} tenant -h" to see what is possible.`,
    )
    .example(
      "Show tenants that are missing the tag 'Environment' and 'CostCenter'",
      `${CLICommand} tag analyze-missing --details --tags Environment,CostCenter`,
    )
    .example(
      "Set a tag value for all tenants that are missing the given 'environment' tag",
      `${CLICommand} tag set-missing environment`,
    )
    .action(() => {
      tagCmd.showHelp();
    });

  program.command("tag", tagCmd);

  tagCmd
    .command("analyze-missing", analyzeMissingTags)
    .command("set-missing <tagKey:string>", setMissingTags);
}
