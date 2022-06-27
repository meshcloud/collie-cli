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
    let result: T;

    try {
      result = await this.runner.run(commands, options);
    } catch (error) {
      await this.handler.handleError(commands, options, error);
    }

    // it's important we handle result outside of try catch, otherwise we will end up passing
    // custom errors thrown from handleResult into handleError

    // typescript isn't smart enough to figure result is set when we got here
    // because the handleError called from catch block above is a Promise<never>

    // deno-lint-ignore no-extra-non-null-assertion
    await this.handler.handleResult(commands, options, result!!);

    // deno-lint-ignore no-extra-non-null-assertion
    return result!!;
  }
}
