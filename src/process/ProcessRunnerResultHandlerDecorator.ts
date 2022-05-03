import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "./ProcessRunnerResultHandler.ts";

export class ProcessRunnerResultHandlerDecorator<T extends ProcessRunnerResult>
  implements IProcessRunner<T> {
  constructor(
    private runner: IProcessRunner<T>,
    private handler: ProcessRunnerResultHandler,
  ) {}

  public async run(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<T> {
    const result = await this.runner.run(commands, options);

    this.handler.handleResult(commands, options, result);

    return result;
  }
}
