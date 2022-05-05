import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResultHandler } from "./ProcessRunnerResultHandler.ts";
import { ProcessRunnerError } from "../errors.ts";

/**
 * Treat a failed subcommand as fatal to collie's execution.
 * Raise as a ProcessRunnerError in every situation except successful result (exit status code 0).
 */
export class ProcessRunnerErrorResultHandler
  implements ProcessRunnerResultHandler {
  // deno-lint-ignore require-await
  async handleError(
    commands: string[],
    options: ProcessRunnerOptions,
    error: Error,
  ): Promise<never> {
    throw new ProcessRunnerError(commands, options, error);
  }

  // deno-lint-ignore require-await
  async handleResult(
    commands: string[],
    options: ProcessRunnerOptions,
    result: ProcessRunnerResult,
  ): Promise<void> {
    if (result.status.success) {
      return;
    }

    throw new ProcessRunnerError(commands, options, result);
  }
}
