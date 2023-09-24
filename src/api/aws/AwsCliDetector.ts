import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";
import * as semver from "std/semver";

export class AwsCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("aws", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    const components = versionCmdOutput.split(" ");

    const version = components[0].substring("aws-cli/".length);

    return version;
  }

  protected isSupportedVersion(version: string): boolean {
    return semver.satisfies(version, ">=2.0.0");
  }
}
