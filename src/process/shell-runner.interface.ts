import { ShellOutput } from "./shell-output.ts";

export interface IShellRunner {
  // deno-lint-ignore no-explicit-any
  run(commandStr: string, env?: any): Promise<ShellOutput>;
}
