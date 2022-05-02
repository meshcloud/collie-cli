import { IShellRunner } from "./IShellRunner.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import { ShellRunnerResult } from "./ShellRunnerResult.ts";
import { ShellRunnerResultHandler } from "./ShellRunnerResultHandler.ts";

export class ShellRunnerResultHandlerDecorator<T extends ShellRunnerResult>
  implements IShellRunner<T> {
  constructor(
    private runner: IShellRunner<T>,
    private handler: ShellRunnerResultHandler,
  ) {}

  public async run(
    commands: string[],
    options: ShellRunnerOptions,
  ): Promise<T> {
    const result = await this.runner.run(commands, options);

    this.handler.handleResult(commands, options, result);

    return result;
  }
}
