import {
  TerragruntRunMode,
  toVerb,
} from "/api/terragrunt/TerragruntCliFacade.ts";

import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { Command } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { PlatformDeployer } from "../../foundation/PlatformDeployer.ts";
import { PlatformModuleType } from "./PlatformModuleType.ts";
import { CLI } from "../../info.ts";
import { LiteralArgsParser } from "../LiteralArgsParser.ts";

interface DeployOptions {
  platform: string;
  bootstrap: boolean;
  autoApprove: boolean;
  upgrade: boolean;
  module?: string;
}

export function registerDeployCmd(program: Command) {
  const cmd = program
    .command("deploy <foundation:foundation>")
    .description(
      "Deploy platform modules in your cloud foundations using terragrunt",
    )
    .type("module", new PlatformModuleType())
    .option(
      "-p, --platform <platform:platform>", // todo: make optional -> deploy all platforms!
      "the platform to deploy",
    )
    .option("--module [module:module]", "Execute this specific module", {
      conflicts: ["bootstrap"],
    })
    .option("--bootstrap", "deploy the bootstrap module")
    .option(
      "--upgrade",
      "run the equivalent of 'terragrunt init --upgrade' before the actual deploy commands.",
      // note that terragrunt will run auto-init when a configuration has never been initialised, but it will not run upgrades
      // this option quickly and elegantly solves that problem
    )
    .option(
      "-- [args...]",
      "pass the following raw arguments to terragrunt instead of running the default 'apply'.",
    )
    .example(
      "Dump terraform state",
      `${CLI} foundation deploy myfoundation --platform aws --module admin/root -- state pull`,
    )
    .action(
      async (
        opts: DeployOptions & GlobalCommandOptions,
        foundation: string,
      ) => {
        const literalArgs = LiteralArgsParser.parse(cmd.getRawArgs());

        const collieRepo = new CollieRepository("./");
        const logger = new Logger(collieRepo, opts);
        const validator = new ModelValidator(logger);

        const modes = terragruntModes(opts, literalArgs);

        for (const mode of modes) {
          const foundationProgress = opts.platform
            ? new NullProgressReporter()
            : new ProgressReporter(
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
        }
      },
    );
}

function terragruntModes(
  opts: DeployOptions & GlobalCommandOptions,
  literalArgs: string[],
) {
  const modes: TerragruntRunMode[] = [];

  if (opts.upgrade) {
    modes.push("init -upgrade");
  }

  if (literalArgs.length) {
    modes.push({ raw: literalArgs });
  } else {
    modes.push("apply");
  }

  return modes;
}

async function deployFoundation(
  repo: CollieRepository,
  foundation: FoundationRepository,
  mode: TerragruntRunMode,
  opts: GlobalCommandOptions & DeployOptions,
  logger: Logger,
) {
  const factory = new CliApiFacadeFactory(repo, logger);

  const terragrunt = buildTerragrunt(opts, factory);

  const platforms = opts.platform
    ? [foundation.findPlatform(opts.platform)]
    : foundation.platforms;

  // we do not parallelize deploying platforms - although this would be technically possible, it's very difficult
  // to debug any errors for an operator. If we later decide to do this, we should try and see if we can offload this
  // challenge to tools that are already equipped to handle this in some sensible way (e.g. terragrunt with multiple --include-dir or gnu parallels etc.)

  for (const platform of platforms) {
    const deployer = new PlatformDeployer(
      platform,
      repo,
      foundation,
      terragrunt,
      logger,
    );

    if (opts.bootstrap) {
      await deployer.deployBootstrapModules(mode);
    } else {
      await deployer.deployPlatformModules(mode, opts.module);
    }
  }
}

/**
 * A null object that allows us to skip reporting for foundation/platform progress when those are not needed
 */
class NullProgressReporter {
  done(): void {}
}

function buildTerragrunt(
  opts: GlobalCommandOptions & DeployOptions,
  factory: CliApiFacadeFactory,
) {
  const args = [];
  if (opts.autoApprove) {
    // we pass --auto-approve to individual terraform commands
    // and --terragrunt-non-interactive to terragrunt's own prompts, e.g. when terragrunt run-all
    args.push("--auto-approve", "--terragrunt-non-interactive");
  }

  return factory.buildTerragrunt(args);
}
