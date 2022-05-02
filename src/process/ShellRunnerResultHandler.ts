import { ShellRunnerResult } from "./ShellRunnerResult.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";

export interface ShellRunnerResultHandler {
  handleResult(
    command: string[],
    options: ShellRunnerOptions | undefined,
    result: ShellRunnerResult,
  ): void;
}

/**
 * Format a human-readable POSIX shell style command
 */
export function formatAsShellCommand(
  commands: string[],
  options?: ShellRunnerOptions,
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
