import { CliInstallationStatusError } from "../errors.ts";
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

  async tryRaiseInstallationStatusError(cli: string, versionRegex: RegExp) {
    const status = await this.verifyCliInstalled(cli, versionRegex);
    switch (status.status) {
      case InstallationStatus.NotInstalled:
      case InstallationStatus.UnsupportedVersion:
        throw new CliInstallationStatusError(cli, status.status);
      case InstallationStatus.Installed:
        break;
    }
  }

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
