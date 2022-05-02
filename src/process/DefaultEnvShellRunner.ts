import { ShellOutput } from "./shell-output.ts";
import { IShellRunner } from "./shell-runner.interface.ts";

export class DefaultEnvShellRunner implements IShellRunner {
  constructor(
    private readonly runner: IShellRunner,
    private readonly defaultEnv: Record<string, string>,
  ) {}

  public async run(
    commandStr: string,
    env?: Record<string, string>,
  ): Promise<ShellOutput> {
    return await this.runner.run(commandStr, { ...this.defaultEnv, ...env });
  }
}
