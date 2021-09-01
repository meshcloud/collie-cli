import { CmdGlobalOptions } from "./commands/cmd-options.ts";
import { isatty } from "./commands/tty.ts";

export function setupLogger(options: CmdGlobalOptions) {
  if (!options.debug) {
    // Setup debug log with nop function.
    console.debug = () => {};
  } else {
    const origDebugFn = console.debug;
    console.debug = (msg) => {
      origDebugFn("DEBUG: " + msg);
    };
  }

  // We more or less use a global var here even if this makes testing harder in order to
  // keep the function usage simple and argument count low.
  if (!isatty) {
    // We disable logging when somebody is using pipes (|) or redirects (>)
    console.debug = () => {};
    console.log = () => {};
    console.error = () => {};
  }
}
