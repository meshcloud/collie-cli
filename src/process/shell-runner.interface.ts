import { ShellOutput } from "./shell-output.ts";

export interface IShellRunner {
  run(commandStr: string): Promise<ShellOutput>;
}
