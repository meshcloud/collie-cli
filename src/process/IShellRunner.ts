// todo: probably have to rename the whole thing to ProcessRunner - we never run sth through a shell
// but instead run processes directly
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResult } from "./ShellRunnerResult.ts";

export interface IShellRunner<T extends ShellRunnerResult> {
  run(commands: string[], options?: ShellRunnerOptions): Promise<T>;
}
