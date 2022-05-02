import { ShellRunnerResult } from "./ShellRunnerResult.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResultHandler } from "./ShellRunnerResultHandler.ts";

/**
 * Treat a failed subcommand as fatal to collie's execution.
 * Print error and exit
 */
export class ExitCollieErrorHandler implements ShellRunnerResultHandler {
  handleResult(
    commands: string[],
    _options: ShellRunnerOptions | undefined,
    result: ShellRunnerResult,
  ) {
    if (result.status.success) {
      return;
    }

    const shellCommand = commands.join(" ");

    console.log(
      `'${shellCommand}' finished with exit code ${result.status.code}`,
    );

    Deno.exit(result.status.code);
  }
}
