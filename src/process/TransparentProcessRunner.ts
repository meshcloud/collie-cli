import { ProcessResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { IProcessRunner } from "./IProcessRunner.ts";

/**
 * Runs a subprocess transaprently by connecting it to collie's stdout/stderr.
 * Use this runner to run commands visibly for the user.
 *
 * This runner should not be used when running with --quiet flag.
 */
export class TransparentProcessRunner implements IProcessRunner<ProcessResult> {
  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
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

    return result;
  }
}
