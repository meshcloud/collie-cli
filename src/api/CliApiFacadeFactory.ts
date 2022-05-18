import { Logger } from "../cli/Logger.ts";
import { AwsCliEnv, AzCliEnv, GcloudCliEnv } from "../model/CliToolEnv.ts";
import { DefaultsProcessRunnerDecorator } from "../process/DefaultsProcessRunnerDecorator.ts";
import { IProcessRunner } from "../process/IProcessRunner.ts";
import { QuietProcessRunner } from "../process/QuietProcessRunner.ts";
import { LoggingProcessRunnerDecorator } from "../process/LoggingProcessRunnerDecorator.ts";
import {
  ProcessResult,
  ProcessResultWithOutput,
} from "../process/ProcessRunnerResult.ts";
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
import { ProcessRunnerErrorResultHandler } from "./ProcessRunnerErrorResultHandler.ts";
import { TerragruntCliFacade } from "./terragrunt/TerragruntCliFacade.ts";
import { CliDetector } from "./CliDetector.ts";
import { TransparentProcessRunner } from "../process/TransparentProcessRunner.ts";
import { NpmCliDetector } from "./npm/NpmCliDetector.ts";
import { NpmCliFacade } from "./npm/NpmCliFacade.ts";
import { TerraformDocsCliFacade } from "./terraform-docs/TerraformDocsCliFacade.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

export class CliApiFacadeFactory {
  constructor(
    private readonly repo: CollieRepository,
    private readonly logger: Logger,
  ) {}

  buildCliDetectors() {
    const processRunner = this.buildProcessRunner();
    return [
      new AwsCliDetector(processRunner),
      new AzCliDetector(processRunner),
      new GcloudCliDetector(processRunner),
      new TerraformCliDetector(processRunner),
      new TerragruntCliDetector(processRunner),
      new TerraformDocsCliDetector(processRunner),
      new NpmCliDetector(processRunner),
    ];
  }

  buildAws(env?: AwsCliEnv, cwd?: string) {
    const processRunner = this.buildProcessRunner();
    const detector = new AwsCliDetector(processRunner);

    const resultHandler = new AwsCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    const facade = new AwsCliFacade(facadeProcessRunner);

    return facade;
  }

  buildGcloud(env?: GcloudCliEnv, cwd?: string) {
    const processRunner = this.buildProcessRunner();
    const detector = new GcloudCliDetector(processRunner);

    const resultHandler = new GcloudCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    const facade = new GcloudCliFacade(facadeProcessRunner);

    return facade;
  }

  buildAz(env?: AzCliEnv, cwd?: string) {
    const processRunner = this.buildProcessRunner();
    const detector = new AzCliDetector(processRunner);

    const resultHandler = new AzCliResultHandler(detector);
    const facadeProcessRunner = this.buildFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    let azure: AzCliFacade = new AzCli(facadeProcessRunner);

    // We can only ask the user if we are in a tty terminal.
    if (Deno.isatty(Deno.stdout.rid)) {
      azure = new AutoInstallAzModuleAzCliDecorator(azure);
    }

    azure = new RetryingAzCliDecorator(azure);

    return azure;
  }

  public buildTerragrunt(defaultArgs: string[]) {
    const detectorRunner = this.buildProcessRunner();
    const detector = new TerragruntCliDetector(detectorRunner);

    let processRunner = this.buildTransparentProcessRunner(detector);

    processRunner = new DefaultsProcessRunnerDecorator(
      processRunner,
      {},
      defaultArgs,
    );

    return new TerragruntCliFacade(processRunner);
  }

  public buildNpm() {
    const detectorRunner = this.buildProcessRunner();
    const detector = new NpmCliDetector(detectorRunner);

    const processRunner = this.buildTransparentProcessRunner(detector);

    return new NpmCliFacade(processRunner);
  }

  public buildTerraformDocs() {
    const detectorRunner = this.buildProcessRunner();
    const detector = new TerraformDocsCliDetector(detectorRunner);

    const processRunner = this.buildTransparentProcessRunner(detector);

    return new TerraformDocsCliFacade(this.repo, processRunner);
  }

  // DESIGN: we need to build up the ProcessRunner behavior in the following order (from outer to inner)
  //   - DefaultsProcessRunnerDecorator -> customise the command that gets run
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

  private buildTransparentProcessRunner(detector: CliDetector) {
    let processRunner: IProcessRunner<ProcessResult> =
      new TransparentProcessRunner();

    processRunner = new LoggingProcessRunnerDecorator(
      processRunner,
      this.logger,
    );

    const resultHandler = new ProcessRunnerErrorResultHandler(detector);
    processRunner = new ResultHandlerProcessRunnerDecorator(
      processRunner,
      resultHandler,
    );
    return processRunner;
  }

  private buildFacadeProcessRunner(
    facadeProcessRunner: IProcessRunner<ProcessResultWithOutput>,
    resultHandler: ProcessRunnerResultHandler,
    env?: Record<string, string>,
    cwd?: string,
  ) {
    facadeProcessRunner = new ResultHandlerProcessRunnerDecorator(
      facadeProcessRunner,
      resultHandler,
    );

    facadeProcessRunner = new DefaultsProcessRunnerDecorator(
      facadeProcessRunner,
      env,
      [],
      cwd,
    );

    return facadeProcessRunner;
  }
}
