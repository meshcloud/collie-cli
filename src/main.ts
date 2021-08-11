import { Command, log, red } from "./deps.ts";
import { init } from "./init.ts";
import { initCommands } from "./commands/init-commands.ts";
import { CmdOptionError } from "./commands/cmd-errors.ts";

let program: Command;

// Init checks
try {
  await init();
  program = initCommands();
} catch (e) {
  log.error(e);
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
  if (e instanceof Error) {
    console.error(red(e.stack || ""));
  }

  // if the error indicates a user error, e.g. wrong typing then display the message and the help.
  if (e instanceof CmdOptionError) {
    program.showHelp();
  }

  Deno.exit(1);
}
