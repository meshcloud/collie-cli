import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class GitCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("git", runner);
  }

  public parseVersion(versionCmdOutput: string): string {
    // some git version strings have additional build info in them, so we only extract what looks like a version number
    const versionRegex = /\d+.\d+.\d+/g;

    const matches = versionCmdOutput.match(versionRegex);

    return (matches && matches[0]) || "";
  }

  protected isSupportedVersion(version: string): boolean {
    // a simple lexicographic comparison is sufficient for our needs

    return version > "2.0.0";
  }
}
