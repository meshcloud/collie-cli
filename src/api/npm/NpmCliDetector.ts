import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";
import * as semver from "std/semver";

export class NpmCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("npm", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.trim();
  }

  protected isSupportedVersion(version: string): boolean {
    return semver.satisfies(version, ">=8.0.0");
  }
}
