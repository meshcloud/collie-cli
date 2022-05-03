import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import { ProcessResultWithOutput } from "./ProcessRunnerResult.ts";

export class StubProcessRunner
  implements IProcessRunner<ProcessResultWithOutput> {
  private nextResult?: ProcessResultWithOutput;

  // deno-lint-ignore no-explicit-any
  setupResultObject(object: Record<string, any>) {
    this.setupResult({
      stdout: JSON.stringify(object, null, 2),
    });
  }

  setupResult(result: Partial<ProcessResultWithOutput>) {
    this.nextResult = {
      status: {
        success: true,
        code: 0,
      },
      stdout: "",
      stderr: "",
      ...result,
    };
  }

  run(
    // deno-lint-ignore no-unused-vars
    commands: string[],
    // deno-lint-ignore no-unused-vars
    options?: ProcessRunnerOptions,
  ): Promise<ProcessResultWithOutput> {
    if (!this.nextResult) {
      throw new Error("no result stubbed, call setupResult first");
    }

    return Promise.resolve(this.nextResult);
  }
}
