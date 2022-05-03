import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";

export interface ProcessRunnerResultHandler {
  handleResult(
    command: string[],
    options: ProcessRunnerOptions | undefined,
    result: ProcessRunnerResult,
  ): void;
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
