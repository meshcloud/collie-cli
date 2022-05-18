import { IProcessRunner } from "../../process/IProcessRunner.ts";
import {
  ProcessResult,
  ProcessRunnerResult,
} from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export class NpmCliFacade {
  constructor(private runner: IProcessRunner<ProcessResult>) {}

  async run(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<ProcessRunnerResult> {
    const result = await this.runner.run(["npm", ...commands], options);

    return result;
  }
}
