import { Logger } from "../cli/Logger.ts";
import { isatty } from "../commands/tty.ts";
import { MeshError } from "../errors.ts";
import { AwsCliEnv, AzCliEnv, GcloudCliEnv } from "../model/CliToolEnv.ts";
import { DefaultEnvProcessRunner } from "../process/DefaultEnvProcessRunner.ts";
import { IProcessRunner } from "../process/IProcessRunner.ts";
import { QuietProcessRunner } from "../process/QuietProcessRunner.ts";
import { ProcessRunnerLoggingDecorator } from "../process/ProcessRunnerLoggingDecorator.ts";
import { ProcessResultWithOutput } from "../process/ProcessRunnerResult.ts";
import { AwsCliFacade } from "./aws/aws-cli-facade.ts";
import { AutoInstallAzureCliModuleDecorator } from "./az/auto-install-azure-cli-module-decorator.ts";
import { AzureCliFacade } from "./az/azure-cli-facade.ts";
import { BasicAzureCliFacade } from "./az/basic-azure-cli-facade.ts";
import { RetryingAzureCliFacadeDecorator } from "./az/retrying-azure-cli-facade-decorator.ts";
import {
  CliFacade,
  CliInstallationStatus,
  InstallationStatus,
} from "./CliFacade.ts";
import { GcpCliFacade } from "./gcloud/gcp-cli-facade.ts";

export class CliApiFacadeFactory {
  private installationStatusCache = new Map<string, CliInstallationStatus>();

  constructor(private readonly logger: Logger) {}

  async buildAws(env?: AwsCliEnv) {
    const processRunner = this.buildProcessRunner(env);
    // const awsProcessRunner = new AwsProcessRunner(processRunner, "default");

    const facade = new AwsCliFacade(processRunner);

    await this.verifyInstallationStatus(facade);

    return facade;
  }

  async buildGcloud(env?: GcloudCliEnv) {
    const processRunner = this.buildProcessRunner(env);

    const facade = new GcpCliFacade(processRunner);

    await this.verifyInstallationStatus(facade);

    return facade;
  }

  async buildAz(env?: AzCliEnv) {
    const processRunner = this.buildProcessRunner(env);

    let azure: AzureCliFacade = new BasicAzureCliFacade(processRunner);

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
      case InstallationStatus.NotInstalled:
        throw new MeshError(
          `"${cmd}" cli is not installed. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
      case InstallationStatus.UnsupportedVersion:
        throw new MeshError(
          `"${cmd}" cli is not installed in a supported version. Please review https://github.com/meshcloud/collie-cli/#prerequisites for installation instructions".`,
        );
      case InstallationStatus.Installed:
        break;
    }
  }

  private buildProcessRunner(env?: Record<string, string>) {
    let processRunner: IProcessRunner<ProcessResultWithOutput> =
      new QuietProcessRunner();

    processRunner = new ProcessRunnerLoggingDecorator(
      processRunner,
      this.logger,
    );

    if (env) {
      processRunner = new DefaultEnvProcessRunner(processRunner, env);
    }

    return processRunner;
  }
}
