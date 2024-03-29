import * as colors from "std/fmt/colors";

import { CompletionsCommand } from "x/cliffy/command";
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
import { FirstTimeExperience } from "./FirstTimeExperience.ts";
import { CollieFoundationDoesNotExistError } from "./model/schemas/ModelValidator.ts";
import { makeTopLevelCommand } from "./commands/TopLevelCommand.ts";
import { registerInfoCommand } from "./commands/info.command.ts";
import { registerConfigCommand } from "./commands/config/config.command.ts";

let shutdownRequested = 0;

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

  registerConfigCommand(program);

  registerInfoCommand(program);
  registerUpgradeCommand(program);
  registerVersionCommand(program);

  program.command("completions", new CompletionsCommand());

  // Shells usually send signals to the entire **process group**, which means that also all of collie's subprocesses
  // will receive the same signal, see https://stackoverflow.com/questions/60193762/who-send-sigint-to-foreground-process-when-press-ctrlc-tty-driver-or-shell
  // Since all of collie's commands are interactive (i.e. collie exits after running what it was doing) and all
  // "long running" work is done by subprocesses anyway, there's nothing we need to do here but notifying the user
  // that we wait for subprocesses to exit and then exiting ourselves.
  Deno.addSignalListener("SIGINT", () => gracefulShutdown());

  // not on windows
  if (isWindows) {
    Deno.addSignalListener("SIGBREAK", () => gracefulShutdown());
  } else {
    Deno.addSignalListener("SIGTERM", () => gracefulShutdown());
  }

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

function gracefulShutdown(): void {
  shutdownRequested += 1;

  if (shutdownRequested == 1) {
    logWithBanner(
      "Interrupt received.\nPlease wait for collie shut down or data loss may occur.\nGracefully shutting down...",
    );
  } else {
    logWithBanner(
      "Two interrupts received, collie will now exit. Data loss may occur.",
    );
    Deno.exit(143);
  }
}

function logWithBanner(msg: string) {
  console.log("\n\n");
  console.log(msg);
  console.log("\n\n");
}
