import { parseJsonWithLog } from "../../json.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { CliDetector } from "../CliDetector.ts";

export class AzCliDetector extends CliDetector {
  constructor(runner: IProcessRunner<ProcessResultWithOutput>) {
    super("az", runner);
  }

  override async runVersionCommand() {
    return await this.runner.run(["az", "version", "--output", "json"]);
  }

  protected parseVersion(versionCmdOutput: string): string {
    // deno-lint-ignore no-explicit-any
    const version = parseJsonWithLog<Record<string, any>>(versionCmdOutput);

    return version["azure-cli"];
  }

  protected isSupportedVersion(version: string): boolean {
    return CliDetector.testSemverSatisfiesRange(version, ">2.0.0");
  }
}
