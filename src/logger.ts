import { CmdGlobalOptions } from "./commands/cmd-options.ts";
import { log } from "./deps.ts";

export async function setupLogger(options: CmdGlobalOptions) {
  const defaultLogLevel: log.LogConfig = {
    handlers: {
      default: new log.handlers.ConsoleHandler("DEBUG"),
    },

    loggers: {
      default: {
        level: "INFO",
        handlers: ["default"],
      },
    },
  };

  if (options.debug) {
    defaultLogLevel.loggers = {
      default: {
        level: "DEBUG",
        handlers: ["default"],
      },
    };
  }

  if (!Deno.isatty(Deno.stdout.rid)) {
    // We disable logging when somebody is using pipes (|) or redirects (>)
    defaultLogLevel.loggers = {};
  }

  await log.setup(defaultLogLevel);
}
