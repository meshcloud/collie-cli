import { Command, CompletionsCommand } from "../deps.ts";
import { OutputFormat } from "../presentation/output-format.ts";
import { registerCacheCommand } from "./cache.command.ts";
import { OutputFormatType } from "./cmd-options.ts";
import { registerConfigCommand } from "./config.command.ts";
import { registerFeedbackCommand } from "./feedback.command.ts";
import { registerTenantCommand } from "./tenant.command.ts";
import { CLICommand, CLIName } from "../config/config.model.ts";
import { registerCreateIssueCommand } from "./create-issue.command.ts";
import { VERSION } from "../config/info.ts";
import { isWindows } from "../os.ts";
import { registerUserCommand } from "./user.command.ts";
import { registerTagCommand } from "./tag/tag.command.ts";
import { registerUpgradeCommand } from "./upgrade.ts";

export function initCommands(): Command {
  const program = new Command()
    .name(CLICommand)
    .help({
      // The darkblue of Cliffy doesn't look great on the blue of PowerShell.
      colors: !isWindows,
    })
    .version(VERSION)
    .type("output", OutputFormatType)
    .option("-o --output [output:output]", "Defines the output format.", {
      default: OutputFormat.TABLE,
      global: true,
    })
    .option("--debug [boolean:boolean]", "Display debug logs", {
      default: false,
      global: true,
    })
    .option(
      "--verbose [boolean:boolean]",
      "Display underlying individual cloud CLI commands",
      {
        default: false,
        global: true,
      },
    )
    .description(
      `${CLIName} CLI - Herd your cloud environments with Collie. Built with love by meshcloud.io`,
    );

  registerConfigCommand(program);
  registerTenantCommand(program);
  registerTagCommand(program);
  registerCreateIssueCommand(program);
  registerFeedbackCommand(program);
  registerCacheCommand(program);
  registerUserCommand(program);
  registerUpgradeCommand(program);

  program.command("completions", new CompletionsCommand());

  return program;
}
