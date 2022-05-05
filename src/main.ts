import { Command, red } from "./deps.ts";
import { initCommands } from "./commands/init-commands.ts";
import { CmdOptionError } from "./commands/cmd-errors.ts";
import { MeshError } from "./errors.ts";
import { CLICommand } from "./config/config.model.ts";

let program: Command;

// Init checks
try {
  program = initCommands();
} catch (e) {
  console.error(e);
  Deno.exit(1);
}

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
    console.error(
      `Tip: run ${CLICommand} with --verbose and --debug flags for more details.`,
    );
  }

  Deno.exit(1);
}
