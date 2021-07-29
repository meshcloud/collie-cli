import { Command, CompletionsCommand } from "../deps.ts";
import { OutputFormat } from "../presentation/output-format.ts";
import { registerCacheCommand } from "./cache.command.ts";
import { OutputFormatType } from "./cmd-options.ts";
import { registerConfigCmd } from "./config.command.ts";
import { registerFeedbackCommand } from "./feedback.command.ts";
import { registerTenantCommand } from "./tenant.command.ts";
import { CLICommand, CLIName } from "../config/config.model.ts";
import { registerCreateIssueCommand } from "./create-issue.command.ts";
import { VERSION } from "../config/version.ts";

export function initCommands(): Command {
  const program = new Command()
    .name(CLICommand)
    .help({
      // The darkblue of Cliffy doesn't look great on the blue of PowerShell.
      colors: Deno.build.os !== "windows",
    })
    .version(VERSION)
    .type("output", OutputFormatType)
    .option(
      "-o --output [output:output]",
      "Defines the output format.",
      {
        default: OutputFormat.TABLE,
        global: true,
      },
    )
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
    .description(`${CLIName} CLI - Herd your cloud environments with Collie`);

  registerConfigCmd(program);
  registerTenantCommand(program);
  registerCreateIssueCommand(program);
  registerFeedbackCommand(program);
  registerCacheCommand(program);

  program
    .command("completions", new CompletionsCommand());

  return program;
}
