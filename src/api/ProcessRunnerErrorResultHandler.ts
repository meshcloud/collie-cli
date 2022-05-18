import { ProcessRunnerError } from "../errors.ts";
import { CliDetector } from "../api/CliDetector.ts";
import { ProcessRunnerOptions } from "../process/ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "../process/ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "../process/ProcessRunnerResultHandler.ts";

/**
 * Treat a failed subcommand as fatal to collie's execution.
 * Raise as a ProcessRunnerError in every situation except successful result (exit status code 0).
 */
export class ProcessRunnerErrorResultHandler
  implements ProcessRunnerResultHandler {
  constructor(private readonly detector: CliDetector) {}

  async handleError(
    commands: string[],
    options: ProcessRunnerOptions,
    error: Error,
  ): Promise<never> {
    await this.detector.tryRaiseInstallationStatusError();

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
