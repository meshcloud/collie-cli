import { ShellOutput } from "./shell-output.ts";
import { IShellRunner } from "./shell-runner.interface.ts";
import { isWindows } from "../os.ts";

export class ShellRunner implements IShellRunner {
  public async run(
    commandStr: string,
    env?: { [key: string]: string },
  ): Promise<ShellOutput> {
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
      env: env,
    });

    const decoder = new TextDecoder();
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();
    const { code } = await p.status();

    const result = {
      code: code,
      stderr: decoder.decode(rawError),
      stdout: decoder.decode(rawOutput),
    };

    console.debug(`Exit code for running '${commandStr}' is ${code}`);
    if (code != 0) {
      console.debug(result.stdout);
      console.debug(result.stderr);
    }

    return result;
  }
}
