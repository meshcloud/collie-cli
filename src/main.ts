import { log } from "./deps.ts";
import { init } from "./init.ts";
import { initCommands } from "./commands/init-commands.ts";
import { MeshError } from "./errors.ts";
import { CmdOptionError } from "./commands/cmd-errors.ts";

await init();

const program = initCommands();

const hasArgs = Deno.args.length > 0;
if (!hasArgs) {
  program.showHelp();
  Deno.exit(0);
}

try {
  await program.parse(Deno.args);
} catch (e) {
  // if the error indicates a user error, e.g. wrong typing then display the message and the help.
  if (e instanceof CmdOptionError) {
    log.error(e.message);
    program.showHelp();
    Deno.exit(1);
  }

  if (log.getLogger().level === log.LogLevels.DEBUG) {
    log.error(e);
  } else {
    if (e instanceof MeshError) {
      log.error(e.message);
    } else {
      log.error(
        "There was an error during programm execution. For more information please execute the command with the --debug flag.",
      );
    }
  }

  Deno.exit(1);
}
