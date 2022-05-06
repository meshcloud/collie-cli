import { Logger } from "../../cli/Logger.ts";
import { IProcessRunner } from "/process/IProcessRunner.ts";
import { LoggingProcessRunnerDecorator } from "/process/LoggingProcessRunnerDecorator.ts";
import { ProcessRunnerErrorResultHandler } from "/process/ProcessRunnerErrorResultHandler.ts";
import { ProcessResult } from "/process/ProcessRunnerResult.ts";
import { ResultHandlerProcessRunnerDecorator } from "/process/ResultHandlerProcessRunnerDecorator.ts";
import { TransparentProcessRunner } from "/process/TransparentProcessRunner.ts";

export function buildTransparentProcessRunner(logger: Logger) {
  let processRunner: IProcessRunner<ProcessResult> =
    new TransparentProcessRunner();

  processRunner = new LoggingProcessRunnerDecorator(processRunner, logger);
  processRunner = new ResultHandlerProcessRunnerDecorator(
    processRunner,
    new ProcessRunnerErrorResultHandler(),
  );
  return processRunner;
}
