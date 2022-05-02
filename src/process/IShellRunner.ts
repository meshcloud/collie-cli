import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResult } from "./ShellRunnerResult.ts";

export interface IShellRunner<T extends ShellRunnerResult> {
  run(commands: string[], options?: ShellRunnerOptions): Promise<T>;
}
