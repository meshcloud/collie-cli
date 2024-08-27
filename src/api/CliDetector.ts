import * as semver from "std/semver";

import { CliInstallationStatusError } from "../errors.ts";
import { IProcessRunner } from "../process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "../process/ProcessRunnerResult.ts";
import { InstallationStatus } from "./CliInstallationStatus.ts";

export type CliDetectionResult =
  | {
    cli: string;
    status: InstallationStatus.NotInstalled;
  }
  | {
    cli: string;
    status:
      | InstallationStatus.Installed
      | InstallationStatus.UnsupportedVersion;
    version: string;
    info: string;
  };

export interface ICliDetector {
  tryRaiseInstallationStatusError(): Promise<void>;
  detect(): Promise<CliDetectionResult>;
}

export abstract class CliDetector implements ICliDetector {
  constructor(
    protected readonly cli: string,
    protected readonly runner: IProcessRunner<ProcessResultWithOutput>,
  ) {}

  async tryRaiseInstallationStatusError() {
    const { status } = await this.detect();
    switch (status) {
      case InstallationStatus.NotInstalled:
      case InstallationStatus.UnsupportedVersion:
        throw new CliInstallationStatusError(this.cli, status);
      case InstallationStatus.Installed:
        break;
    }
  }

  protected async runVersionCommand(): Promise<ProcessResultWithOutput> {
    return await this.runner.run([this.cli, "--version"]);
  }

  async detect(): Promise<CliDetectionResult> {
    try {
      const result = await this.runVersionCommand();

      if (result.status.code !== 0) {
        return this.notInstalled();
      }

      const version = this.parseVersion(result.stdout);
      const status = this.isSupportedVersion(version)
        ? InstallationStatus.Installed
        : InstallationStatus.UnsupportedVersion;

      return {
        cli: this.cli,
        info: result.stdout,
        version,
        status,
      };
    } catch {
      // expected errors here include e.g. file not found etc.
      return this.notInstalled();
    }
  }

  private notInstalled(): CliDetectionResult | PromiseLike<CliDetectionResult> {
    return {
      cli: this.cli,
      status: InstallationStatus.NotInstalled,
    };
  }

  protected abstract parseVersion(versionCmdOutput: string): string;
  protected abstract isSupportedVersion(version: string): boolean;

  protected static testSemverSatisfiesRange(
    version: string,
    range: string,
  ): boolean {
    const sversion = semver.parse(version);
    const srange = semver.parseRange(range);

    return semver.testRange(sversion, srange);
  }
}
