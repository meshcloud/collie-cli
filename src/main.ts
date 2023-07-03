import * as colors from "std/fmt/colors";

import { CompletionsCommand } from "./deps.ts";
import { CommandOptionError } from "./commands/CommandOptionError.ts";
import { MeshError } from "./errors.ts";
import { printTip } from "./cli/Logger.ts";
import { CLI, VERSION } from "./info.ts";
import { isWindows } from "./os.ts";
import { registerInitCommand } from "./commands/init.command.ts";
import { registerTenantCommand } from "./commands/tenant/tenant.command.ts";
import { registerUpgradeCommand } from "./commands/upgrade.command.ts";
import { registerKitCommand } from "./commands/kit/kit.command.ts";
import { registerFoundationCommand } from "./commands/foundation/foundation.command.ts";
import { registerComplianceCommand } from "./commands/compliance/compliance.command.ts";
import { registerVersionCommand } from "./commands/version.command.ts";
import { registerInteractiveCommand } from "./commands/interactive/interactive.command.ts";
import { FirstTimeExperience } from "./FirstTimeExperience.ts";
import { CollieFoundationDoesNotExistError } from "./model/schemas/ModelValidator.ts";
import { makeTopLevelCommand } from "./commands/TopLevelCommand.ts";

async function collie() {
  const program = makeTopLevelCommand()
    .name(CLI)
    .description(
      `${CLI} CLI - herd your clouds 🐑. Built with love by meshcloud.io`,
    )
    .help({
      // The darkblue of Cliffy doesn't look great on the blue of PowerShell.
      colors: !isWindows,
    })
    .version(VERSION);

  registerInitCommand(program);
  registerFoundationCommand(program);
  registerTenantCommand(program);
  registerKitCommand(program);
  registerComplianceCommand(program);
  registerInteractiveCommand(program);

  registerUpgradeCommand(program);
  registerVersionCommand(program);

  program.command("completions", new CompletionsCommand());

  // Run the main program with error handling.
  try {
    const hasArgs = Deno.args.length > 0;
    if (!hasArgs) {
      program.showHelp();

      await FirstTimeExperience.tryShowTips();

      Deno.exit(0);
    }
    await program.parse(Deno.args);
  } catch (e) {
    if (e instanceof CommandOptionError) {
      // if the error indicates a user error, e.g. wrong typing then display the message and the help.
      console.error(colors.red(e.message));
      printTip(`run ${CLI} with --help for usage instructions`);
    } else if (e instanceof CollieFoundationDoesNotExistError) {
      // for our own errors, only display message and then exit
      console.error(colors.red(e.message));
      printTip("set up a new foundation with 'collie foundation new'");
    } else if (e instanceof MeshError) {
      // for our own errors, only display message and then exit
      console.error(colors.red(e.message));
      printTip(`run ${CLI} with --verbose and --debug flags for more details`);
    } else if (e instanceof Error) {
      // for unexpected errors, raise the full message and stacktrace
      // note that .stack includes the exception message
      console.error(colors.red(e.stack || ""));
      printTip(`run ${CLI} with --verbose and --debug flags for more details`);
    }

    Deno.exit(1);
  }
}

if (import.meta.main) {
  collie();
}
