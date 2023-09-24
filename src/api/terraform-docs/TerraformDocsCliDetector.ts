import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";
import * as semver from "std/semver";

export class TerraformDocsCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("terraform-docs", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.split(" ")[2];
  }

  protected isSupportedVersion(version: string): boolean {
    return semver.satisfies(version, ">=0.10.0");
  }
}
