import { ProcessResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { IProcessRunner } from "./IProcessRunner.ts";
import { ShellRunnerPolicy } from "./ShellRunnerPolicy.ts";

/**
 * Runs a subprocess transaprently by connecting it to collie's stdout/stderr.
 * Use this runner to run commands visibly for the user.
 */
export class TransparentProcessRunner implements IProcessRunner<ProcessResult> {
  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
  ): Promise<ProcessResult> {
    const args = ShellRunnerPolicy.shellCommands(commands);
    const exec = args.shift();

    if (!exec) {
      throw new Error("Invalid argument: commands is empty");
    }

    const cmd = new Deno.Command(exec, {
      ...options,
      args,
      stdout: "inherit",
      stderr: "inherit",
    });

    const p = cmd.spawn();

    // make sure Deno exits only after the process has exited as well.
    // this is important for correct signal handling beahvior (e.g. SIGTERM cia Ctrl+C) so that collie waits for
    // its subprocess to finish (and rendering all its output) before exiting itself
    p.ref();

    const status = await p.status;

    const result: ProcessResult = {
      status,
    };

    return result;
  }
}
