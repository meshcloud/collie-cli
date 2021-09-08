import { ShellOutput } from "./shell-output.ts";

export interface IShellRunner {
  run(
    commandStr: string,
    env?: { [key: string]: string },
  ): Promise<ShellOutput>;
}
