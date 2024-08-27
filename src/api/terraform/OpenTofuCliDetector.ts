import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class OpenTofuCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("tofu", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.split("\n")[0].substring("OpenTofu ".length);
  }

  protected isSupportedVersion(version: string): boolean {
    return CliDetector.testSemverSatisfiesRange(version, ">=1.0.0");
  }
}
