import {
  CLICommand,
  Config,
  emptyConfig,
  loadConfig,
  PlatformCommand,
} from "./config/config.model.ts";
import { log } from "./deps.ts";
import { MeshError } from "./errors.ts";
import { MeshPlatform } from "./mesh/mesh-tenant.model.ts";
import { ShellOutput } from "./process/shell-output.ts";
import { ShellRunner } from "./process/shell-runner.ts";

export enum PlatformCommandInstallationStatus {
  Installed,
  UnsupportedVersion,
  NotInstalled,
}

export class CliDetector {
  private shellRunner = new ShellRunner();

  async getInstalledClis(): Promise<Config> {
    const config: Config = emptyConfig;

    for (const platform in MeshPlatform) {
      const mp = platform as MeshPlatform;
      const installationStatus = await this.checkCliInstalled(
        PlatformCommand[mp],
      );
      if (installationStatus == PlatformCommandInstallationStatus.Installed) {
        config.connected[mp] = true;
      }
    }

    return config;
  }

  /**
   * Checks the availability of the configured CLIs, throwing an error if a CLI is not correctly installed.
   */
  async verifyCliAvailability() {
    const config = loadConfig();

    // run checks concurrently to improve responsiveness of collie
    // checking a cloud provider cli typically takes ~500ms each (most are implemented in Python), so the speedup
    // we gain from this is significant and perceivable
    const verifications: Promise<void>[] = [];
    for (const platform in MeshPlatform) {
      const promise = this.verifyConnectedCliInstalled(
        config,
        platform as MeshPlatform,
      );
      verifications.push(promise);
    }

    await Promise.all(verifications);
  }

  private async verifyConnectedCliInstalled(
    config: Config,
    platform: MeshPlatform,
  ) {
    const cmd = PlatformCommand[platform];
    if (!config.connected[platform]) {
      return;
    }

    const status = await this.checkCliInstalled(cmd);
    switch (status) {
      case PlatformCommandInstallationStatus.NotInstalled:
        throw new MeshError(
          `${platform} cloud cli "${cmd}" is not installed. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions or disconnect platform via "${CLICommand} config -d ${platform}".`,
        );
      case PlatformCommandInstallationStatus.UnsupportedVersion:
        throw new MeshError(
          `${platform} cloud cli "${cmd}" is not installed in a supported version. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions or disconnect platform via "${CLICommand} config -d ${platform}".`,
        );
      case PlatformCommandInstallationStatus.Installed:
        log.debug(`CLI ${cmd} is correctly installed.`);
        break;
    }
  }

  private async checkCliInstalled(
    cli: PlatformCommand,
  ): Promise<PlatformCommandInstallationStatus> {
    const result = await this.runVersionCommand(cli);

    return this.determineInstallationStatus(cli, result);
  }

  public determineInstallationStatus(
    cli: PlatformCommand,
    result: ShellOutput,
  ) {
    if (result.code !== 0) {
      return PlatformCommandInstallationStatus.NotInstalled;
    }

    const regex = this.supportedCliVersionRegex(cli);

    return regex.test(result.stdout)
      ? PlatformCommandInstallationStatus.Installed
      : PlatformCommandInstallationStatus.UnsupportedVersion;
  }

  private async runVersionCommand(
    cli: PlatformCommand,
  ): Promise<ShellOutput> {
    try {
      return await this.shellRunner.run(`${cli} --version`);
    } catch {
      return { code: -1, stderr: "", stdout: "" };
    }
  }

  private supportedCliVersionRegex(cli: PlatformCommand): RegExp {
    // TODO: maybe this should be part of the CLI facades
    switch (cli) {
      case PlatformCommand.AWS:
        return /^aws-cli\/2\./;
      case PlatformCommand.GCP:
        return /^Google Cloud SDK/;
      case PlatformCommand.Azure:
        return /azure-cli\s+2\./;
    }
  }
}
