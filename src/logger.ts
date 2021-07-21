import { CmdGlobalOptions } from "./commands/cmd-options.ts";
import { isatty } from "./commands/tty.ts";
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

  // We more or less use a global var here even if this makes testing harder in order to
  // keep the function usage simple and argument count low.
  if (!isatty) {
    // We disable logging when somebody is using pipes (|) or redirects (>)
    defaultLogLevel.loggers!.default!.handlers = [];
  }

  await log.setup(defaultLogLevel);
}
