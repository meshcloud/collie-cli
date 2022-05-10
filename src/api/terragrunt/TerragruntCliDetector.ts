import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

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
    return version > "v0.34.0";
  }
}
