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
import { TerraformCliDetector } from "./terraform/TerraformCliDetector.ts";
import { TerragruntCliDetector } from "./terragrunt/TerragruntCliDetector.ts";
import { ProcessRunnerErrorResultHandler } from "./ProcessRunnerErrorResultHandler.ts";
import { TerragruntCliFacade } from "./terragrunt/TerragruntCliFacade.ts";
import { CliDetector } from "./CliDetector.ts";
import { TransparentProcessRunner } from "../process/TransparentProcessRunner.ts";
import { NpmCliDetector } from "./npm/NpmCliDetector.ts";
import { NpmCliFacade } from "./npm/NpmCliFacade.ts";
import { TerraformDocsCliFacade } from "./terraform-docs/TerraformDocsCliFacade.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { GitCliDetector } from "./git/GitCliDetector.ts";
import { GitCliFacade } from "./git/GitCliFacade.ts";
import { TofuOrTerraformCliDetector } from "./terraform/TofuOrTerraformCliDetector.ts";
import { OpenTofuCliDetector } from "./terraform/OpenTofuCliDetector.ts";

export class CliApiFacadeFactory {
  constructor(
    private readonly logger: Logger,
  ) {}

  buildCliDetectors() {
    const processRunner = this.buildQuietLoggingProcessRunner();
    return [
      new AwsCliDetector(processRunner),
      new AzCliDetector(processRunner),
      new GcloudCliDetector(processRunner),
      new GitCliDetector(processRunner),
      new TofuOrTerraformCliDetector(
        new OpenTofuCliDetector(processRunner),
        new TerraformCliDetector(processRunner),
      ),
      new TerragruntCliDetector(processRunner),
      new TerraformDocsCliDetector(processRunner),
      new NpmCliDetector(processRunner),
    ];
  }

  buildAws(env?: AwsCliEnv, cwd?: string) {
    const processRunner = this.buildQuietLoggingProcessRunner();
    const detector = new AwsCliDetector(processRunner);

    const resultHandler = new AwsCliResultHandler(detector);
    const facadeProcessRunner = this.wrapFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    const facade = new AwsCliFacade(facadeProcessRunner);

    return facade;
  }

  buildGcloud(env?: GcloudCliEnv, cwd?: string) {
    const processRunner = this.buildQuietLoggingProcessRunner();
    const detector = new GcloudCliDetector(processRunner);

    const resultHandler = new GcloudCliResultHandler(detector);
    const facadeProcessRunner = this.wrapFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    const facade = new GcloudCliFacade(facadeProcessRunner);

    return facade;
  }

  buildAz(env?: AzCliEnv, cwd?: string) {
    const processRunner = this.buildQuietLoggingProcessRunner();
    const detector = new AzCliDetector(processRunner);

    const resultHandler = new AzCliResultHandler(detector);
    const facadeProcessRunner = this.wrapFacadeProcessRunner(
      processRunner,
      resultHandler,
      env,
      cwd,
    );

    let azure: AzCliFacade = new AzCli(facadeProcessRunner);

    // We can only ask the user if we are in a tty terminal.
    if (Deno.stdout.isTerminal()) {
      azure = new AutoInstallAzModuleAzCliDecorator(azure);
    }

    azure = new RetryingAzCliDecorator(azure);

    return azure;
  }

  public buildGit() {
    const detectorRunner = this.buildQuietLoggingProcessRunner();
    const detector = new GitCliDetector(detectorRunner);
    const resultHandler = new ProcessRunnerErrorResultHandler(detector);
    const quietRunner = new ResultHandlerProcessRunnerDecorator(
      new QuietProcessRunner(),
      resultHandler,
    );

    return new GitCliFacade(detectorRunner, quietRunner);
  }

  public buildTerragrunt() {
    const quietRunner = this.buildQuietLoggingProcessRunner();
    const detector = new TerragruntCliDetector(quietRunner);

    const transparentFacadeRunner = this.buildTransparentProcessRunner(
      detector,
    );

    const quietFacadeRunner = this.wrapFacadeProcessRunner(
      quietRunner,
      new ProcessRunnerErrorResultHandler(detector),
    );

    return new TerragruntCliFacade(transparentFacadeRunner, quietFacadeRunner);
  }

  public buildNpm() {
    const detectorRunner = this.buildQuietLoggingProcessRunner();
    const detector = new NpmCliDetector(detectorRunner);

    const processRunner = this.buildTransparentProcessRunner(detector);

    return new NpmCliFacade(processRunner);
  }

  public buildTerraformDocs(repo: CollieRepository) {
    const quietRunner = this.buildQuietLoggingProcessRunner();
    const detector = new TerraformDocsCliDetector(quietRunner);

    const processRunner = this.wrapFacadeProcessRunner(
      quietRunner,
      new ProcessRunnerErrorResultHandler(detector),
    );

    return new TerraformDocsCliFacade(repo, processRunner);
  }

  // DESIGN: we need to build up the ProcessRunner behavior in the following order (from outer to inner)
  //   - DefaultsProcessRunnerDecorator -> customise the command that gets run
  //   - ResultHandlerProcessRunnerDecorator -> retry/print error on what actually ran
  //   - LoggingProcessRunnerDecorator -> log what actually ran
  //   - actual runner
  //
  // to achieve this we split up buildProcessRunner and buildFacadeProcessRunner methods

  private buildQuietLoggingProcessRunner() {
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

  // TODO: this could possibly use a refactoring for clarity - instead of wrapping existing quiet+logging runners,
  // it's probably easier to just construct a fresh chain of runner behavior for each Facade
  private wrapFacadeProcessRunner(
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
