import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class NpmCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("npm", runner);
  }

  protected parseVersion(versionCmdOutput: string): string {
    return versionCmdOutput.split("\n")[0].substring(
      "npm version ".length,
    );
  }

  protected isSupportedVersion(version: string): boolean {
    return version >= "8.0.0";
  }
}
