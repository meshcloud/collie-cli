import { PlatformCommandInstallationStatus } from "../cli-detector.ts";
import { Logger } from "../cli/Logger.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { isatty, TTY } from "../commands/tty.ts";
import { MeshError } from "../errors.ts";
import { isWindows } from "../os.ts";
import { LoaderShellRunner } from "../process/loader-shell-runner.ts";
import { VerboseShellRunner } from "../process/verbose-shell-runner.ts";
import { AwsCliFacade } from "./aws/aws-cli-facade.ts";
import { AwsShellRunner } from "./aws/aws-shell-runner.ts";
import { CliFacade, CliInstallationStatus } from "./CliFacade.ts";
import { ShellRunner } from "/process/shell-runner.ts";

export class CliApiFacadeFactory {
  private installationStatusCache = new Map<string, CliInstallationStatus>();

  constructor(private readonly logger: Logger) {}

  async buildAws(options: CmdGlobalOptions) {
    const shellRunner = this.buildShellRunner(options);
    const awsShellRunner = new AwsShellRunner(shellRunner, "default");

    const facade = new AwsCliFacade(awsShellRunner);

    await this.verifyInstallationStatus(facade);

    return facade;
  }

  private async verifyInstallationStatus(facade: CliFacade) {
    // maintain a cache of installation status so we don't run any checks again unnecessarily
    const key = Object.getPrototypeOf(facade).name;
    const cachedStatus = this.installationStatusCache.get(key);

    this.logger.debug(
      () =>
        `requested ${key} has a cached installation status of ${cachedStatus
          ?.status}`,
    );

    const status = cachedStatus || (await facade.verifyCliInstalled());

    this.installationStatusCache.set(AwsCliFacade.name, status);

    this.checkInstallationStatus(status);
  }

  checkInstallationStatus(status: CliInstallationStatus) {
    const cmd = status.cli;
    switch (status.status) {
      case PlatformCommandInstallationStatus.NotInstalled:
        throw new MeshError(
          `"${cmd}" cli is not installed. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
      case PlatformCommandInstallationStatus.UnsupportedVersion:
        throw new MeshError(
          `"${cmd}" cli is not installed in a supported version. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
      case PlatformCommandInstallationStatus.Installed:
        break;
    }
  }

  private buildShellRunner(options: CmdGlobalOptions) {
    let shellRunner = new ShellRunner();

    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else if (isatty && !isWindows) {
      shellRunner = new LoaderShellRunner(shellRunner, new TTY());
    }
    return shellRunner;
  }
}
