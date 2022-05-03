import { IProcessRunner } from "../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../process/ProcessRunnerResult.ts";
import { CliInstallationStatus, InstallationStatus } from "./CliFacade.ts";

export enum PlatformCommandInstallationStatus {
  Installed,
  UnsupportedVersion,
  NotInstalled,
}

export class CliDetector {
  constructor(
    private readonly runner: IProcessRunner<ProcessResultWithOutput>,
  ) {}

  // todo: maybe factor detection logic into its own class, not part of the facade?
  async verifyCliInstalled(
    cli: string,
    versionRegex: RegExp,
  ): Promise<CliInstallationStatus> {
    try {
      const result = await this.runner.run([cli, "--version"]);

      return {
        cli,
        status: this.determineInstallationStatus(result, versionRegex),
      };
    } catch {
      // expected errors here include e.g. file not found etc.
      return {
        cli,
        status: InstallationStatus.NotInstalled,
      };
    }
  }

  private determineInstallationStatus(
    result: ProcessResultWithOutput,
    versionRegex: RegExp,
  ) {
    if (result.status.code !== 0) {
      return InstallationStatus.NotInstalled;
    }

    return versionRegex.test(result.stdout)
      ? InstallationStatus.Installed
      : InstallationStatus.UnsupportedVersion;
  }
}
