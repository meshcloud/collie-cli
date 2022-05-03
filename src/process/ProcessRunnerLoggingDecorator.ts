import * as colors from "std/fmt/colors";

import { Logger } from "../cli/Logger.ts";
import { IProcessRunner } from "./IProcessRunner.ts";
import { ProcessRunnerOptions } from "./ProcessRunnerOptions.ts";
import {
  ProcessResultWithOutput,
  ProcessRunnerResult,
} from "./ProcessRunnerResult.ts";
import { formatAsShellCommand } from "./ProcessRunnerResultHandler.ts";

export class ProcessRunnerLoggingDecorator<T extends ProcessRunnerResult>
  implements IProcessRunner<T> {
  constructor(private runner: IProcessRunner<T>, private logger: Logger) {}

  public async run(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<T> {
    this.logger.verbose((_) =>
      colors.magenta(formatAsShellCommand(commands, options))
    );

    const result = await this.runner.run(commands, options);

    this.logger.verbose(
      (_) =>
        `${
          colors.magenta(
            formatAsShellCommand(commands, options),
          )
        } finished with exit code 0`,
    );

    const outputs = result as ProcessResultWithOutput;

    outputs.stdout &&
      this.logger.debug((_) => section("STDOUT", outputs.stdout));
    outputs.stderr &&
      this.logger.debug((_) => section("STDERR", outputs.stderr));

    return result;
  }
}

function section(name: string, text: string): string {
  return [
    colors.magenta(`--- BEGIN ${name} ---`),
    text,
    colors.magenta(`--- END ${name} ---`),
  ].join("\n");
}
