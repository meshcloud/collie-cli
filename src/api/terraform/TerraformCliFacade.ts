import { ProcessResult } from "../../process/ProcessRunnerResult.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";

export class TerraformCliFacade {
  constructor(private runner: IProcessRunner<ProcessResult>) {}

  async init(path: string, opts: { backend: boolean }) {
    const cmds = ["terraform", "init"];

    if (!opts.backend) {
      cmds.push("-backend=false");
    }

    return await this.runner.run(cmds, { cwd: path });
  }

  async validate(path: string) {
    const cmds = ["terraform", "validate"];

    return await this.runner.run(cmds, { cwd: path });
  }
}
