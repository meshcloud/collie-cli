import { Command, CompletionsCommand, red } from "./deps.ts";
import { CmdOptionError } from "./commands/cmd-errors.ts";
import { MeshError } from "./errors.ts";
import { CLICommand, CLIName } from "./config/config.model.ts";
import { printTip } from "./cli/Logger.ts";
import { VERSION } from "./config/info.ts";
import { isWindows } from "./os.ts";
import { OutputFormat } from "/presentation/output-format.ts";
import { OutputFormatType } from "./commands/cmd-options.ts";
import { registerFeedbackCommand } from "./commands/feedback.command.ts";
import { registerTenantCommand } from "./commands/tenant/tenant.command.ts";
import { registerCreateIssueCommand } from "./commands/create-issue.command.ts";
import { registerUserCommand } from "./commands/user/user.command.ts";
import { registerUpgradeCommand } from "./commands/upgrade.ts";
import { registerFoundationCmd } from "./commands/foundation/foundation.command.ts";

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
registerCreateIssueCommand(program);
registerFeedbackCommand(program);
registerUserCommand(program);
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
  if (e instanceof CmdOptionError) {
    // if the error indicates a user error, e.g. wrong typing then display the message and the help.
    program.showHelp();
  } else if (e instanceof MeshError) {
    // for our own errors, only display message and then exit
    console.error(red(e.message));
    console.error(
      `Tip: run ${CLICommand} with --verbose and --debug flags for more details.`,
    );
  } else if (e instanceof Error) {
    // for unexpected errors, raise the full message and stacktrace
    // note that .stack includes the exception message
    console.error(red(e.stack || ""));
    printTip(
      `run ${CLICommand} with --verbose and --debug flags for more details.`,
    );
  }

  Deno.exit(1);
}
