import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";

export class DefaultEnvProcessRunnerDecorator<T extends ProcessRunnerResult>
  implements IProcessRunner<T> {
  constructor(
    private readonly runner: IProcessRunner<T>,
    private readonly defaultEnv: Record<string, string>,
  ) {}

  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
  ): Promise<T> {
    return await this.runner.run(commands, {
      env: { ...this.defaultEnv, ...(options && options.env) },
    });
  }
}
