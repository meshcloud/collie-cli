import { parseJsonWithLog } from "../../json.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class CustomCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("custom", runner);
  }

  override async runVersionCommand() {
    return await this.runner.run(["custom", "version", "--output", "json"]);
  }

  protected parseVersion(versionCmdOutput: string): string {
    // deno-lint-ignore no-explicit-any
    const version = parseJsonWithLog<Record<string, any>>(versionCmdOutput);

    return version["custom-cli"];
  }

  protected isSupportedVersion(version: string): boolean {
    return CliDetector.testSemverSatisfiesRange(version, ">2.0.0");
  }
}
