import { PlatformCommandInstallationStatus } from "../cli-detector.ts";
import { Logger } from "../cli/Logger.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { isatty, TTY } from "../commands/tty.ts";
import { MeshError } from "../errors.ts";
import { AwsCliEnv, AzCliEnv, GcloudCliEnv } from "../model/CliToolEnv.ts";
import { isWindows } from "../os.ts";
import {
  DefaultEnvShellRunner,
  LegacyDefaultEnvShellRunner,
} from "../process/DefaultEnvShellRunner.ts";
import { IShellRunner } from "../process/IShellRunner.ts";
import { LoaderShellRunner } from "../process/loader-shell-runner.ts";
import { QuietShellRunner } from "../process/QuietShellRunner.ts";
import { IShellRunner as LegacyIShellRunner } from "../process/shell-runner.interface.ts";
import { ShellRunnerLoggingDecorator } from "../process/ShellRunnerLoggingDecorator.ts";
import { ProcessResultWithOutput } from "../process/ShellRunnerResult.ts";
import { VerboseShellRunner } from "../process/verbose-shell-runner.ts";
import { AwsCliFacade } from "./aws/aws-cli-facade.ts";
import { AutoInstallAzureCliModuleDecorator } from "./az/auto-install-azure-cli-module-decorator.ts";
import { AzureCliFacade } from "./az/azure-cli-facade.ts";
import { BasicAzureCliFacade } from "./az/basic-azure-cli-facade.ts";
import { RetryingAzureCliFacadeDecorator } from "./az/retrying-azure-cli-facade-decorator.ts";
import { CliFacade, CliInstallationStatus } from "./CliFacade.ts";
import { GcpCliFacade } from "./gcloud/gcp-cli-facade.ts";
import { ShellRunner } from "/process/shell-runner.ts";

export class CliApiFacadeFactory {
  private installationStatusCache = new Map<string, CliInstallationStatus>();

  constructor(
    private readonly logger: Logger,
    private readonly options: CmdGlobalOptions,
  ) {}

  async buildAws(env?: AwsCliEnv) {
    const shellRunner = this.buildShellRunner(env);
    // const awsShellRunner = new AwsShellRunner(shellRunner, "default");

    const facade = new AwsCliFacade(shellRunner);

    await this.verifyInstallationStatus(facade);

    return facade;
  }

  async buildGcloud(env?: GcloudCliEnv) {
    const shellRunner = this.buildLegacyShellRunner(this.options, env);

    const facade = new GcpCliFacade(shellRunner);

    await this.verifyInstallationStatus(facade);

    return facade;
  }

  async buildAz(env?: AzCliEnv) {
    const shellRunner = this.buildShellRunner(env);

    let azure: AzureCliFacade = new BasicAzureCliFacade(shellRunner);

    // We can only ask the user if we are in a tty terminal.
    if (isatty) {
      azure = new AutoInstallAzureCliModuleDecorator(azure);
    }

    azure = new RetryingAzureCliFacadeDecorator(azure);

    await this.verifyInstallationStatus(azure);

    return azure;
  }

  private async verifyInstallationStatus(facade: CliFacade) {
    // maintain a cache of installation status so we don't run any checks again unnecessarily
    const key = facade.constructor.name;
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

  private checkInstallationStatus(status: CliInstallationStatus) {
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

  private buildLegacyShellRunner(
    options: CmdGlobalOptions,
    env?: Record<string, string>,
  ): LegacyIShellRunner {
    let shellRunner = new ShellRunner();

    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else if (isatty && !isWindows) {
      shellRunner = new LoaderShellRunner(shellRunner, new TTY());
    }

    if (env) {
      shellRunner = new LegacyDefaultEnvShellRunner(shellRunner, env);
    }

    return shellRunner;
  }

  private buildShellRunner(env?: Record<string, string>) {
    let shellRunner: IShellRunner<ProcessResultWithOutput> =
      new QuietShellRunner();

    shellRunner = new ShellRunnerLoggingDecorator(shellRunner, this.logger);

    if (env) {
      shellRunner = new DefaultEnvShellRunner(shellRunner, env);
    }

    return shellRunner;
  }
}
