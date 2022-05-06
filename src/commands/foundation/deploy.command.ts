import {
  Terragrunt,
  TerragruntRunMode,
  toVerb,
} from "/api/terragrunt/Terragrunt.ts";

import { CmdGlobalOptions } from "../cmd-options.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { Command } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { PlatformDeployerFactory } from "../../kit/PlatformDeployerFactory.ts";
import { TransparentProcessRunner } from "../../process/TransparentProcessRunner.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResult } from "../../process/ProcessRunnerResult.ts";
import { LoggingProcessRunnerDecorator } from "../../process/LoggingProcessRunnerDecorator.ts";
import { ResultHandlerProcessRunnerDecorator } from "../../process/ResultHandlerProcessRunnerDecorator.ts";
import { ProcessRunnerErrorResultHandler } from "../../process/ProcessRunnerErrorResultHandler.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";

interface DeployOptions {
  platform: string;
  bootstrap: boolean;
  apply: boolean;
  upgrade: boolean;
}
export function registerDeployCmd(program: Command) {
  program
    .command("deploy <foundation>")
    .option(
      "-p, --platform <platform:string>", // todo: make optional -> deploy all platforms!
      "the platform to deploy",
    )
    .option(
      "--bootstrap",
      "Execute bootstrapping steps instead of non-bootstrap deploy steps.",
    )
    .option(
      "--apply",
      "run the equivalent of 'terragrunt apply' instead of the default 'terraform plan'.",
    )
    .option(
      "--upgrade",
      "run the equivalent of 'terragrunt init --upgrade' before the actual deploy (plan or apply) commands.",
      // note that terragrunt will run auto-init, the upgrade command is useful for local development when a .terragrunt-cache dir already exists
    )
    .description("Deploys your cloud foundation.")
    .action(
      async (opts: DeployOptions & CmdGlobalOptions, foundation: string) => {
        const collieRepo = new CollieRepository("./");
        const logger = new Logger(collieRepo, opts);
        const validator = new ModelValidator(logger);

        const modes = terragruntModes(opts);

        for (const mode of modes) {
          const foundationProgress = new ProgressReporter(
            toVerb(mode),
            collieRepo.relativePath(
              collieRepo.resolvePath("foundations", foundation),
            ),
            logger,
          );

          const foundationRepo = await FoundationRepository.load(
            collieRepo,
            foundation,
            validator,
          );
          await deployFoundation(
            collieRepo,
            foundationRepo,
            mode,
            opts,
            logger,
          );

          foundationProgress.done();

          if (mode === "plan") {
            logger.tip("to apply changes re-run with --apply option.");
          }
        }
      },
    );
}

function terragruntModes(opts: DeployOptions & CmdGlobalOptions) {
  const modes: TerragruntRunMode[] = [];

  if (opts.upgrade) {
    modes.push("init -upgrade");
  }

  modes.push(opts.apply ? "apply -auto-approve" : "plan");

  return modes;
}

async function deployFoundation(
  repo: CollieRepository,
  foundation: FoundationRepository,
  mode: TerragruntRunMode,
  opts: CmdGlobalOptions & DeployOptions,
  logger: Logger,
) {
  const terragrunt = buildTerragrunt(logger);

  const platforms = opts.platform
    ? [foundation.findPlatform(opts.platform)]
    : foundation.platforms;

  // we do not parallelize deploying platforms - although this would be technically possible, it's very difficult
  // to debug any errors for an operator. If we later decide to do this, we should try and see if we can offload this
  // challenge to tools that are already equipped to handle this in some sensible way (e.g. terragrunt with multiple --include-dir or gnu parallels etc.)

  for (const platform of platforms) {
    const platformProgress = new ProgressReporter(
      toVerb(mode),
      repo.relativePath(foundation.resolvePlatformPath(platform)),
      logger,
    );

    const factory = new PlatformDeployerFactory(
      repo,
      foundation,
      terragrunt,
      logger,
    );
    const cmd = factory.buildDeployer(platform);

    if (opts.bootstrap) {
      await cmd.deployBootstrapModules(mode);
    } else {
      await cmd.deployPlatformModules(mode);
    }

    platformProgress.done();
  }
}

function buildTerragrunt(logger: Logger) {
  let processRunner: IProcessRunner<ProcessResult> =
    new TransparentProcessRunner();

  processRunner = new LoggingProcessRunnerDecorator(processRunner, logger);
  processRunner = new ResultHandlerProcessRunnerDecorator(
    processRunner,
    new ProcessRunnerErrorResultHandler(),
  );

  return new Terragrunt(processRunner);
}
