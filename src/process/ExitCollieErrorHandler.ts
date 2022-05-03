import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import {
  formatAsShellCommand,
  ProcessRunnerResultHandler,
} from "./ProcessRunnerResultHandler.ts";

/**
 * Treat a failed subcommand as fatal to collie's execution.
 * Print error and exit
 */
export class ExitCollieErrorHandler implements ProcessRunnerResultHandler {
  handleResult(
    commands: string[],
    options: ProcessRunnerOptions | undefined,
    result: ProcessRunnerResult,
  ) {
    if (result.status.success) {
      return;
    }

    console.error(
      `Error: '${
        formatAsShellCommand(commands, options)
      }' exited with code ${result.status.code}`,
    );

    Deno.exit(result.status.code);
  }
}
