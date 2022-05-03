import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";

export interface IProcessRunner<T extends ProcessRunnerResult> {
  run(commands: string[], options?: ProcessRunnerOptions): Promise<T>;
}
