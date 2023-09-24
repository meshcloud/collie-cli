import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";
import * as semver from "std/semver";

export class GcloudCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("gcloud", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    const version = versionCmdOutput
      .split("\n")[0]
      .substring("Google Cloud SDK ".length);

    return version;
  }

  protected isSupportedVersion(version: string): boolean {
    return semver.satisfies(version, ">200.0.0");
  }
}
