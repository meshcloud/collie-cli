import { ShellOutput } from "./shell-output.ts";
import { IShellRunner } from "./shell-runner.interface.ts";
import { isWindows } from "../os.ts";

export class ShellRunner implements IShellRunner {
  public async run(commandStr: string): Promise<ShellOutput> {
    // For Windows machines, we need to prepend cmd /c as it allows you to call internal and external CMD commands.
    // For more info: https://stackoverflow.com/a/62031448
    if (isWindows) {
      commandStr = "cmd /c " + commandStr;
    }

    const commands = commandStr.split(" ");
    console.debug(`ShellRunner running '${commandStr}'`);

    const p = Deno.run({
      cmd: commands,
      stdout: "piped",
      stderr: "piped",
    });

    const decoder = new TextDecoder();
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();
    const { code } = await p.status();

    console.debug(`Exit code for running '${commandStr}' is ${code}`);

    return {
      code: code,
      stderr: decoder.decode(rawError),
      stdout: decoder.decode(rawOutput),
    };
  }
}
