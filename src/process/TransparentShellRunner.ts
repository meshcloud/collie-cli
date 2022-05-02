import { ProcessResult } from "./ShellRunnerResult.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { IShellRunner } from "./IShellRunner.ts";
import { ExitCollieErrorHandler } from "./ExitCollieErrorHandler.ts";

/**
 * Runs a subprocess transaprently by connecting it to collie's stdout/stderr.
 * Use this runner to run commands visibly for the user.
 *
 * This runner should not be used when running with --quiet flag.
 */
export class TransparentShellRunner implements IShellRunner<ProcessResult> {
  constructor(private readonly errorHandler = new ExitCollieErrorHandler()) {}

  public async run(
    commands: string[],
    options?: ShellRunnerOptions,
  ): Promise<ProcessResult> {
    const p = Deno.run({
      ...options,
      cmd: commands,
      stdout: "inherit",
      stderr: "inherit",
    });

    const status = await p.status();

    p.close();

    const result: ProcessResult = {
      status,
    };

    if (!result.status.success) {
      this.errorHandler.handleUnsuccessfulResult(commands, options, result);
    }

    return result;
  }
}
