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
import { GcloudCliDetector } from "./gcloud/GcloudCliDetector.ts";
import { GcloudCliResultHandler } from "./gcloud/GcloudCliResultHandler.ts";
import { ResultHandlerProcessRunnerDecorator } from "../process/ResultHandlerProcessRunnerDecorator.ts";
import { AzCliResultHandler } from "./az/AzCliResultHandler.ts";
import { AzCliDetector } from "./az/AzCliDetector.ts";
import { ProcessRunnerResultHandler } from "../process/ProcessRunnerResultHandler.ts";
import { AwsCliResultHandler } from "./aws/AwsCliResultHandler.ts";
import { AwsCliDetector } from "./aws/AwsCliDetector.ts";
import { TerraformDocsCliDetector } from "./terraform-docs/TerraformDocsCliDetector.ts";
import { TerraformCliDetector } from "./terragrunt/TerraformCliDetector.ts";
import { TerragruntCliDetector } from "./terragrunt/TerragruntCliDetector.ts";

export class CliApiFacadeFactory {
  constructor(private readonly logger: Logger) {}

  buildCliDetectors() {
    const processRunner = this.buildProcessRunner();
    return [
      new AwsCliDetector(processRunner),
      new AzCliDetector(processRunner),
      new GcloudCliDetector(processRunner),
      new TerraformCliDetector(processRunner),
      new TerragruntCliDetector(processRunner),
      new TerraformDocsCliDetector(processRunner),
    ];
  }

  buildAws(env?: AwsCliEnv) {
    const processRunner = this.buildProcessRunner();
    const detector = new AwsCliDetector(processRunner);

    const resultHandler = new AwsCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
    );

    const facade = new AwsCliFacade(facadeProcessRunner);

    return facade;
  }

  buildGcloud(env?: GcloudCliEnv) {
    const processRunner = this.buildProcessRunner();
    const detector = new GcloudCliDetector(processRunner);

    const resultHandler = new GcloudCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
    );

    const facade = new GcloudCliFacade(facadeProcessRunner);

    return facade;
  }

  buildAz(env?: AzCliEnv) {
    const processRunner = this.buildProcessRunner();
    const detector = new AzCliDetector(processRunner);

    const resultHandler = new AzCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
    );

    let azure: AzCliFacade = new AzCli(facadeProcessRunner);

    // We can only ask the user if we are in a tty terminal.
    if (Deno.isatty(Deno.stdout.rid)) {
      azure = new AutoInstallAzModuleAzCliDecorator(azure);
    }

    azure = new RetryingAzCliDecorator(azure);

    return azure;
  }

  // DESIGN: we need ot build up the ProcessRunner behavior in the following order (from outer to inner)
  //   - DefaultEnvProcessRunnerDecorator -> customise the command that gets run
  //   - ResultHandlerProcessRunnerDecorator -> retry/print error on what actually ran
  //   - LoggingProcessRunnerDecorator -> log what actually ran
  //   - actual runner
  //
  // to achieve this we split up buildProcessRunner and buildFacadeProcessRunner methods

  private buildProcessRunner() {
    let processRunner: IProcessRunner<ProcessResultWithOutput> =
      new QuietProcessRunner();

    processRunner = new LoggingProcessRunnerDecorator(
      processRunner,
      this.logger,
    );

    return processRunner;
  }

  private buildFacadeProcessRunner(
    facadeProcessRunner: IProcessRunner<ProcessResultWithOutput>,
    resultHandler: ProcessRunnerResultHandler,
    env?: Record<string, string>,
  ) {
    facadeProcessRunner = new ResultHandlerProcessRunnerDecorator(
      facadeProcessRunner,
      resultHandler,
    );

    if (env) {
      facadeProcessRunner = new DefaultEnvProcessRunnerDecorator(
        facadeProcessRunner,
        env,
      );
    }
    return facadeProcessRunner;
  }
}
