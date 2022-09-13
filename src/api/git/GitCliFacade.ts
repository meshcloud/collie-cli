import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResult } from "../../process/ProcessRunnerResult.ts";

export class GitCliFacade {
  constructor(private readonly processRunner: IProcessRunner<ProcessResult>) {}

  async init() {
    // note: rerunning git init is safe
    // https://stackoverflow.com/questions/5149694/does-running-git-init-twice-initialize-a-repository-or-reinitialize-an-existing
    await this.processRunner.run(["git", "init"]);
  }
}
