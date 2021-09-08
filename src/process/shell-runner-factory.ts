import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { isatty, TTY } from "../commands/tty.ts";
import { isWindows } from "../os.ts";
import { ShellRunner } from "../process/shell-runner.ts";
import { LoaderShellRunner } from "./loader-shell-runner.ts";
import { VerboseShellRunner } from "./verbose-shell-runner.ts";

export class ShellRunnerFactory {
  buildShellRunner(options: CmdGlobalOptions): ShellRunner {
    let shellRunner = new ShellRunner();

    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else if (isatty && !isWindows) {
      shellRunner = new LoaderShellRunner(shellRunner, new TTY());
    }

    return shellRunner;
  }
}