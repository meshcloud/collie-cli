import { Logger } from "../cli/Logger.ts";
import { AwsCliEnv, AzCliEnv, GcloudCliEnv } from "../model/CliToolEnv.ts";
import { DefaultEnvProcessRunnerDecorator } from "../process/DefaultEnvProcessRunnerDecorator.ts";
import { IProcessRunner } from "../process/IProcessRunner.ts";
import { QuietProcessRunner } from "../process/QuietProcessRunner.ts";
import { LoggingProcessRunnerDecorator } from "../process/LoggingProcessRunnerDecorator.ts";
import { ProcessResultWithOutput } from "../process/ProcessRunnerResult.ts";
import { AwsCliFacade } from "./aws/AwsCliFacade.ts";
import { AzCliFacade } from "./az/AzCliFacade.ts";
import { GcloudCliFacade } from "./gcloud/GcloudCliFacade.ts";
import { AutoInstallAzModuleAzCliDecorator } from "./az/AutoInstallAzModuleAzCliDecorator.ts";
import { AzCli } from "./az/AzCli.ts";
import { RetryingAzCliDecorator } from "./az/RetryingAzCliDecorator.ts";

export class CliApiFacadeFactory {
  constructor(private readonly logger: Logger) {}

  buildAws(env?: AwsCliEnv) {
    const processRunner = this.buildProcessRunner(env);

    const facade = new AwsCliFacade(processRunner);

    return facade;
  }

  buildGcloud(env?: GcloudCliEnv) {
    const processRunner = this.buildProcessRunner(env);

    const facade = new GcloudCliFacade(processRunner);

    return facade;
  }

  buildAz(env?: AzCliEnv) {
    const processRunner = this.buildProcessRunner(env);

    let azure: AzCliFacade = new AzCli(processRunner);

    // We can only ask the user if we are in a tty terminal.
    if (Deno.isatty(Deno.stdout.rid)) {
      azure = new AutoInstallAzModuleAzCliDecorator(azure);
    }

    azure = new RetryingAzCliDecorator(azure);

    return azure;
  }

  private buildProcessRunner(env?: Record<string, string>) {
    let processRunner: IProcessRunner<ProcessResultWithOutput> =
      new QuietProcessRunner();

    processRunner = new LoggingProcessRunnerDecorator(
      processRunner,
      this.logger,
    );

    if (env) {
      processRunner = new DefaultEnvProcessRunnerDecorator(processRunner, env);
    }

    return processRunner;
  }
}
