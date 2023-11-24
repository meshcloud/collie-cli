import * as colors from "std/fmt/colors";
import { CollieRepository } from "/model/CollieRepository.ts";
import { GlobalCommandOptions } from "/commands/GlobalCommandOptions.ts";
import { CLI } from "../info.ts";

/**
 * Convenienve format utils we supply to logging methods callbacks. Using these methods simplifies common formatting
 * operations without consumers having to explicitly pull in other modules/dependencies.
 */
export interface FormatUtils {
  // TODO: rename to colliePath?
  kitPath(path: string): string;
}
/**
 * Standardizes concerns relating to CLI logging
 *
 * All "logs" should go to stderr by default, we hence use console.error to write them.
 * Collie reserves stdout for primary output.
 *
 * See https://julienharbulot.com/python-cli-streams.html for rationale.
 */
export class Logger {
  private enableVerbose: boolean;
  private enableDebug: boolean;
  readonly fmtUtils: FormatUtils;

  constructor(kit: CollieRepository, opts: GlobalCommandOptions) {
    this.enableVerbose = !!opts.verbose;
    this.enableDebug = !!opts.debug;

    this.fmtUtils = {
      kitPath(dest: string) {
        return kit.relativePath(dest);
      },
    };
  }

  public verbose(f: (fmt: FormatUtils) => string) {
    if (this.enableVerbose) {
      const msg = f(this.fmtUtils);
      console.error(colors.gray(msg));
    }
  }

  public debug(f: (fmt: FormatUtils) => string) {
    if (this.enableDebug) {
      const msg = f(this.fmtUtils);
      console.error(colors.gray(msg));
    }
  }

  public progress(msg: string) {
    console.error(colors.bold(colors.green(msg)));
  }

  public warn(msg: string | ((fmt: FormatUtils) => string)) {
    const message = typeof msg === "string" ? msg : msg(this.fmtUtils);
    console.error(colors.yellow(message));
  }

  public error(msg: string | ((fmt: FormatUtils) => string)) {
    const message = typeof msg === "string" ? msg : msg(this.fmtUtils);
    console.error(colors.red(message));
  }

  public tip(msg: string | ((fmt: FormatUtils) => string)) {
    const message = typeof msg === "string" ? msg : msg(this.fmtUtils);

    printTip(message);
  }

  public tipCommand(msg: string, command: string) {
    printTip(msg);
    console.error(colors.cyan(`\t$ ${CLI} ${command}`));
  }
}

export function printTip(msg: string) {
  console.error(colors.cyan(colors.italic("Tip: " + msg)));
}
