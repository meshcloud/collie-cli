import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessRunnerResult } from "./ProcessRunnerResult.ts";
import { ProcessRunnerResultHandler } from "./ProcessRunnerResultHandler.ts";

export class ResultHandlerProcessRunnerDecorator<T extends ProcessRunnerResult>
  implements IProcessRunner<T> {
  constructor(
    private runner: IProcessRunner<T>,
    private handler: ProcessRunnerResultHandler,
  ) {}

  public async run(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<T> {
    try {
      const result = await this.runner.run(commands, options);
      await this.handler.handleResult(commands, options, result);

      return result;
    } catch (error) {
      await this.handler.handleError(commands, options, error);
    }

    // typescript isn't smart enough to figure out this code should never be reachable, see
    // https://github.com/microsoft/TypeScript/issues/34955

    throw new Error("Inavlid ProcessRunnerResultHandler");
  }
}
