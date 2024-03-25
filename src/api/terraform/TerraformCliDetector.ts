import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class TerraformCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("terraform", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.split("\n")[0].substring("Terraform ".length);
  }

  protected isSupportedVersion(version: string): boolean {
    return CliDetector.testSemverSatisfiesRange(version, ">=1.0.0");
  }
}
