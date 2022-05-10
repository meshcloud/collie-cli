import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

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
    // a simple lexicographic comparison is sufficient for our needs
    return version > "200.0.0";
  }
}
