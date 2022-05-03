import { Command, CompletionsCommand } from "../deps.ts";
import { OutputFormat } from "../presentation/output-format.ts";
import { OutputFormatType } from "./cmd-options.ts";
import { registerFeedbackCommand } from "./feedback.command.ts";
import { registerTenantCommand } from "./tenant/tenant.command.ts";
import { CLICommand, CLIName } from "../config/config.model.ts";
import { registerCreateIssueCommand } from "./create-issue.command.ts";
import { VERSION } from "../config/info.ts";
import { isWindows } from "../os.ts";
import { registerUserCommand } from "./user/user.command.ts";
import { registerUpgradeCommand } from "./upgrade.ts";
import { registerFoundationCmd } from "./foundation/foundation.command.ts";
import { registerInteractiveCommand } from "./interactive.command.ts";

export function initCommands(): Command {
  const program = new Command()
    .name(CLICommand)
    .help({
      // The darkblue of Cliffy doesn't look great on the blue of PowerShell.
      colors: !isWindows,
    })
    .version(VERSION)
    .globalType("output", OutputFormatType)
    .globalOption("-o --output [output:output]", "Defines the output format.", {
      default: OutputFormat.TABLE,
    })
    .globalOption(
      "--quiet",
      "Don't show progress or error messages, output only result data",
    )
    .globalOption(
      "--verbose ",
      "Enable printing verbose info (command execution and results)",
      {
        conflicts: ["quiet"],
      },
    )
    .globalOption(
      "--debug",
      "Enable printing debug info (command output, intermediate results)",
    )
    .description(
      `${CLIName} CLI - Herd your clouds with collie. Built with love by meshcloud.io`,
    );

  registerFoundationCmd(program);
  registerTenantCommand(program);
  registerInteractiveCommand(program);
  registerCreateIssueCommand(program);
  registerFeedbackCommand(program);
  registerUserCommand(program);
  registerUpgradeCommand(program);

  program.command("completions", new CompletionsCommand());

  return program;
}
