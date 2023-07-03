import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessResultWithOutput } from "./ProcessRunnerResult.ts";
import { ShellRunnerPolicy } from "./ShellRunnerPolicy.ts";

/**
 * Runs a subprocess quietly by buffering its stdout and stderr in memory until completion.
 */
export class QuietProcessRunner
  implements IProcessRunner<ProcessResultWithOutput> {
  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
  ): Promise<ProcessResultWithOutput> {
    const args = ShellRunnerPolicy.shellCommands(commands);
    const exec = args.shift();

    if (!exec) {
      throw new Error("Invalid argument: commands is empty");
    }

    const cmd = new Deno.Command(exec, {
      ...options,
      args,
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();

    const decoder = new TextDecoder();

    const result = {
      status: {
        signal: output.signal,
        code: output.code,
        success: output.success,
      },
      stdout: decoder.decode(output.stdout),
      stderr: decoder.decode(output.stderr),
    };

    return result;
  }
}
