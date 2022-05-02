import { IShellRunner } from "./IShellRunner.ts";
import { ShellOutput } from "./shell-output.ts";
import { IShellRunner as LegacyIShellRunner } from "./shell-runner.interface.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResult } from "./ShellRunnerResult.ts";

export class LegacyDefaultEnvShellRunner implements LegacyIShellRunner {
  constructor(
    private readonly runner: LegacyIShellRunner,
    private readonly defaultEnv: Record<string, string>,
  ) {}

  public async run(
    commandStr: string,
    env?: Record<string, string>,
  ): Promise<ShellOutput> {
    return await this.runner.run(commandStr, { ...this.defaultEnv, ...env });
  }
}

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
