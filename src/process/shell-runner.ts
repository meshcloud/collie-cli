import { log } from "../deps.ts";
import { ShellOutput } from "./shell-output.ts";
import { IShellRunner } from "./shell-runner.interface.ts";

export class ShellRunner implements IShellRunner {

  public async run(commandStr: string): Promise<ShellOutput> {
    const commands = commandStr.split(" ");

    log.debug(`ShellRunner running '${commandStr}'`);

    const p = Deno.run({
      cmd: commands,
      stdout: "piped",
      stderr: "piped",
    });

    const decoder = new TextDecoder();
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();
    const { code } = await p.status();


    log.debug(`Exit code for running '${commandStr}' is ${code}`);

    return {
      code: code,
      stderr: decoder.decode(rawError),
      stdout: decoder.decode(rawOutput),
    };
  }
}
