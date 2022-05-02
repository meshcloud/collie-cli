import * as colors from "std/fmt/colors";

import { Logger } from "../cli/Logger.ts";
import { IShellRunner } from "./IShellRunner.ts";
import { ShellRunnerOptions } from "./ShellRunnerOptions.ts";
import {
  ProcessResultWithOutput,
  ShellRunnerResult,
} from "./ShellRunnerResult.ts";
import { formatAsShellCommand } from "./ShellRunnerResultHandler.ts";

export class ShellRunnerLoggingDecorator<T extends ShellRunnerResult>
  implements IShellRunner<T> {
  constructor(private runner: IShellRunner<T>, private logger: Logger) {}

  public async run(
    commands: string[],
    options: ShellRunnerOptions,
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
