import { IShellRunner } from "./IShellRunner.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResult } from "./ShellRunnerResult.ts";

export class DefaultEnvShellRunner<T extends ShellRunnerResult>
  implements IShellRunner<T> {
  constructor(
    private readonly runner: IShellRunner<T>,
    private readonly defaultEnv: Record<string, string>,
  ) {}

  public async run(
    commands: string[],
    options?: ShellRunnerOptions,
  ): Promise<T> {
    return await this.runner.run(commands, {
      env: { ...this.defaultEnv, ...(options && options.env) },
    });
  }
}
