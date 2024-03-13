import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { QuietProcessRunner } from "../../process/QuietProcessRunner.ts";

export class GitCliFacade {
  constructor(
    private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
    private readonly quietRunner: QuietProcessRunner,
  ) {}

  async init(repoDir: string) {
    // note: rerunning git init is safe
    // https://stackoverflow.com/questions/5149694/does-running-git-init-twice-initialize-a-repository-or-reinitialize-an-existing
    await this.processRunner.run(["git", "init", repoDir]);
  }

  async clone(destDir: string, repoUrl: string) {
    // note: rerunning git init is safe
    // https://stackoverflow.com/questions/5149694/does-running-git-init-twice-initialize-a-repository-or-reinitialize-an-existing
    await this.processRunner.run(["git", "clone", repoUrl, destDir]);
  }

  async getLatestTag(repoDir: string): Promise<string> {
    const result = await this.processRunner.run([
      "git",
      "describe",
      "--tags",
      "--abbrev=0",
    ], { cwd: repoDir });

    return result.stdout.trim();
  }

  async getTags(repoDir: string): Promise<string> {
    const result = await this.processRunner.run([
      "git",
      "tag",
    ], { cwd: repoDir });

    return result.stdout.trim();
  }

  async checkout(repoDir: string, tagValue: string) {
    await this.processRunner.run(["git", "checkout", tagValue], {
      cwd: repoDir,
    });
  }
  /**
   * Checks if the given dir is a .git repo dir.
   * This method is using a QuietProcessRunner because we typcially don't want to output repo detection logic via
   * a TransparentProcessRunner
   *
   * @param repoGitDir path to a .git dir
   * @returns
   */
  async isRepo(repoGitDir: string) {
    // see https://stackoverflow.com/a/16925062/125407
    try {
      const output = await this.quietRunner.run(
        ["git", "rev-parse", "--is-inside-git-dir"],
        { cwd: repoGitDir },
      );

      return output.status.success;
    } catch {
      return false;
    }
  }
}
