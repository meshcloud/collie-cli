import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

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
    // a simple lexicographic comparison is sufficient for our needs
    return version > "2.0.0";
  }
}
