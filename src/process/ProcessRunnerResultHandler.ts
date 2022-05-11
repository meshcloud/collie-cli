import * as path from "std/path";

import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";

export interface ProcessRunnerResultHandler {
  /**
   * Handle the result of an execution of the command.
   * Note that this result can be both successful (exit code 0) and unsuccessful.
   */
  handleResult(
    command: string[],
    options: ProcessRunnerOptions,
    result: ProcessRunnerResult,
  ): Promise<void>;

  /**
   * Handle errors that occured while executing the command.
   * For example, deno raises a NotFound error if the executable can't be found
   */
  handleError(
    command: string[],
    options: ProcessRunnerOptions,
    error: Error,
  ): Promise<never>;
}

/**
 * Format a human-readable POSIX shell style command
 */
export function formatAsShellCommand(
  commands: string[],
  options?: ProcessRunnerOptions,
) {
  let shellCommand = commands.join(" ");

  // add env directly before the command
  const env = options &&
    options.env &&
    Object.entries(options.env).map(([k, v]) => `${k}=${v}`);

  if (env) {
    shellCommand = `${env} ${shellCommand}`;
  }

  // perform a relative cd if necessary - relative cds are shorter than absolute cd's
  // it's also fine to break with the convention here of always printing "collie-repo relative" paths since this
  // needs to present commands as the user would run them in their own shell
  const cd = options && options.cwd &&
    `cd ${path.relative(Deno.cwd(), options.cwd)}`;
  if (cd) {
    shellCommand = `(${cd} && ${shellCommand})`; // wrap in subshell via () so cd doesn't affect parent shell
  }

  return shellCommand;
}
