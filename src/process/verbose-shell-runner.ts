import { ShellOutput } from "./shell-output.ts";
import { IShellRunner } from "./shell-runner.interface.ts";

export class VerboseShellRunner implements IShellRunner {
  constructor(private runner: IShellRunner) {}

  public async run(
    commandStr: string,
    env?: { [key: string]: string },
  ): Promise<ShellOutput> {
    console.log(commandStr);
    return await this.runner.run(commandStr, env);
  }
}
