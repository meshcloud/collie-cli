import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";

export class DefaultsProcessRunnerDecorator<T extends ProcessRunnerResult>
  implements IProcessRunner<T> {
  constructor(
    private readonly runner: IProcessRunner<T>,
    private readonly defaultEnv: Record<string, string>,
    private readonly defaultArgs?: string[],
  ) {}

  public async run(
    commands: string[],
    options?: ProcessRunnerOptions,
  ): Promise<T> {
    const cmds = [...commands, ...(this.defaultArgs || [])];

    const opts = options
      ? {
        ...options,
        env: { ...this.defaultEnv, ...options.env },
      }
      : { env: this.defaultEnv };

    return await this.runner.run(cmds, opts);
  }
}
