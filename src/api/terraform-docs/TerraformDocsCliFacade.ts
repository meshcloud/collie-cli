import * as fs from "std/fs";
import * as path from "std/path";

import { CollieRepository } from "../../model/CollieRepository.ts";
import { ProcessResult } from "../../process/ProcessRunnerResult.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";

export class TerraformDocsCliFacade {
  constructor(
    private readonly collie: CollieRepository,
    private runner: IProcessRunner<ProcessResult>,
  ) {}

  async updateReadme(modulePath: string) {
    const cmds = [
      "terraform-docs",
      "markdown",
      modulePath,
      "--output-file",
      "README.md",
    ];

    if (await fs.exists(path.join(modulePath, "modules"))) {
      cmds.push("--recursive"); // terraform docs fails if we tell it to generate recursively but the output folder does not exists
    }

    // by running relative to kit repo dir, we get terraform-docs to output kit-relative paths, which matches
    // the consistent path output in our cli tool (always output kit-relative pahts)
    return await this.runner.run(cmds, { cwd: this.collie.resolvePath() });
  }
}
