import { Command, CompletionsCommand, red } from "./deps.ts";
import { CommandOptionError } from "./commands/CommandOptionError.ts";
import { MeshError } from "./errors.ts";
import { printTip } from "./cli/Logger.ts";
import { CLI, VERSION } from "./info.ts";
import { isWindows } from "./os.ts";
import { OutputFormat } from "/presentation/output-format.ts";
import { registerFeedbackCommand } from "./commands/feedback.command.ts";
import { registerTenantCommand } from "./commands/tenant/tenant.command.ts";
import { registerCreateIssueCommand } from "./commands/create-issue.command.ts";
import { registerUpgradeCommand } from "./commands/upgrade.command.ts";
import { registerKitCommand } from "./commands/kit/kit.command.ts";
import { registerFoundationCommand } from "./commands/foundation/foundation.command.ts";
import { registerComplianceCommand } from "./commands/compliance/compliance.ts";
import { registerDocsCommand } from "./commands/foundation/docs.command.ts";
import { OutputFormatType } from "./commands/GlobalCommandOptions.ts";

async function collie() {
  const program = new Command()
    .name(CLI)
    .help({
      // The darkblue of Cliffy doesn't look great on the blue of PowerShell.
      colors: !isWindows,
    })
    .version(VERSION)
    .globalType("output", OutputFormatType)
    .globalOption("-o --output [output:output]", "Defines the output format", {
      default: OutputFormat.TABLE,
    })
    .globalOption(
      "--verbose ",
      "Enable printing verbose info (command execution and results)",
    )
    .globalOption(
      "--debug",
      "Enable printing debug info (command output, intermediate results)",
    )
    .description(
      `${CLI} CLI - herd your cloud 🐑 environments.Built with love by meshcloud.io`,
    );

  registerFoundationCommand(program);
  registerTenantCommand(program);
  registerKitCommand(program);
  registerComplianceCommand(program);
  registerDocsCommand(program);

  registerCreateIssueCommand(program);
  registerFeedbackCommand(program);
  registerUpgradeCommand(program);

  program.command("completions", new CompletionsCommand());

  // Run the main program with error handling.
  try {
    const hasArgs = Deno.args.length > 0;
    if (!hasArgs) {
      program.showHelp();
      Deno.exit(0);
    }
    await program.parse(Deno.args);
  } catch (e) {
    if (e instanceof CommandOptionError) {
      // if the error indicates a user error, e.g. wrong typing then display the message and the help.
      program.showHelp();
    } else if (e instanceof MeshError) {
      // for our own errors, only display message and then exit
      console.error(red(e.message));
      printTip(`run ${CLI} with --verbose and --debug flags for more details.`);
    } else if (e instanceof Error) {
      // for unexpected errors, raise the full message and stacktrace
      // note that .stack includes the exception message
      console.error(red(e.stack || ""));
      printTip(`run ${CLI} with --verbose and --debug flags for more details.`);
    }

    Deno.exit(1);
  }
}

if (import.meta.main) {
  collie();
}
