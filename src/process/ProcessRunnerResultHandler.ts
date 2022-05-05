import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";

export interface ProcessRunnerResultHandler {
  /**
   * Handle the result of an execution of the command.
   * Note that this result can be both successful (exit code 0) and unsuccessful.
   */
  handleResult(
    command: string[],
    options: ProcessRunnerOptions | undefined,
    result: ProcessRunnerResult,
  ): Promise<void>;

  /**
   * Handle errors that occured while executing the command.
   * For example, deno raises a NotFound error if the executable can't be found
   */
  handleError(
    command: string[],
    options: ProcessRunnerOptions | undefined,
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

  const cd = options && options.cwd && `cd ${options.cwd}`;
  if (cd) {
    shellCommand = cd + " && " + shellCommand;
  }

  const env = options &&
    options.env &&
    Object.entries(options.env).map(([k, v]) => `${k}=${v}`);

  if (env) {
    shellCommand = env + "; " + shellCommand;
  }

  return shellCommand;
}
