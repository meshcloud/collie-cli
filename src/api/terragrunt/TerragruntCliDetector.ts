import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";
import * as semver from "std/semver";

export class TerragruntCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("terragrunt", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.split("\n")[0].substring(
      "terragrunt version ".length,
    );
  }

  protected isSupportedVersion(version: string): boolean {
    // required for "--terragrunt-no-auto-apply" option, see https://github.com/gruntwork-io/terragrunt/pull/2156
    return semver.satisfies(version, ">=0.38.1");
  }
}
