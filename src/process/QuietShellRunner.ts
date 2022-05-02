import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { IShellRunner } from "./IShellRunner.ts";
import { ProcessResultWithOutput } from "./ShellRunnerResult.ts";
import { ShellRunnerResultHandler } from "./ShellRunnerResultHandler.ts";

/**
 * Runs a subprocess quietly by buffering its stdout and stderr in memory until completion.
 */
export class QuietShellRunner implements IShellRunner<ProcessResultWithOutput> {
  constructor(private readonly errorHandler?: ShellRunnerResultHandler) {}

  public async run(
    commands: string[],
    options?: ShellRunnerOptions,
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

    if (!result.status.success) {
      this.errorHandler?.handleResult(commands, options, result);
    }

    return result;
  }
}
