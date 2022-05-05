import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessResultWithOutput } from "./ProcessRunnerResult.ts";

/**
 * Runs a subprocess quietly by buffering its stdout and stderr in memory until completion.
 */
export class QuietProcessRunner
  implements IProcessRunner<ProcessResultWithOutput> {
  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
  ): Promise<ProcessResultWithOutput> {
    const p = Deno.run({
      ...options,
      cmd: commands,
      stdout: "piped",
      stderr: "piped",
    });

    const decoder = new TextDecoder();
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();
    const status = await p.status();

    p.close();

    const result = {
      status,
      stderr: decoder.decode(rawError),
      stdout: decoder.decode(rawOutput),
    };

    return result;
  }
}
