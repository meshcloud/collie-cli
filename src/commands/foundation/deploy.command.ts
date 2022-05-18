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
import { PlatformDeployerFactory } from "../../foundation/PlatformDeployerFactory.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";

interface DeployOptions {
  platform: string;
  bootstrap: boolean;
  plan: boolean;
  destroy: boolean;
  autoApprove: boolean;
  upgrade: boolean;
  module?: string;
}

export function registerDeployCmd(program: Command) {
  program
    .command("deploy <foundation:foundation>")
    .option(
      "-p, --platform <platform:platform>", // todo: make optional -> deploy all platforms!
      "the platform to deploy",
    )
    .option(
      "--bootstrap",
      "Execute bootstrapping steps instead of non-bootstrap deploy steps.",
    )
    .option("--module [module:string]", "Execute this specific module", {
      conflicts: ["bootstrap"],
    })
    .option("--auto-approve", "run terragrunt with '--auto-approve' option", {
      conflicts: ["upgrade", "plan"],
    })
    .option(
      "--plan",
      "run the equivalent of 'terragrunt plan' instead of the default 'terraform apply'.",
      { conflicts: ["destroy"] },
    )
    .option(
      "--destroy",
      "run the equivalent of 'terragrunt destroy' instead of the default 'terraform apply'.",
      { conflicts: ["plan"] },
    )
    .option(
      "--upgrade",
      "run the equivalent of 'terragrunt init --upgrade' before the actual deploy commands.",
      // note that terragrunt will run auto-init, the upgrade command is useful for local development when a .terragrunt-cache dir already exists
    )
    .description("Deploys your cloud foundation.")
    .action(
      async (
        opts: DeployOptions & GlobalCommandOptions,
        foundation: string,
      ) => {
        const collieRepo = new CollieRepository("./");
        const logger = new Logger(collieRepo, opts);
        const validator = new ModelValidator(logger);

        const modes = terragruntModes(opts);

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

          if (mode === "plan") {
            logger.tip("to apply changes re-run with --apply option.");
          }
        }
      },
    );
}

function terragruntModes(opts: DeployOptions & GlobalCommandOptions) {
  const modes: TerragruntRunMode[] = [];

  if (opts.upgrade) {
    modes.push("init -upgrade");
  }

  if (opts.plan) {
    modes.push("plan");
  } else if (opts.destroy) {
    modes.push("destroy");
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
    const platformProgress = opts.bootstrap || opts.module
      ? new NullProgressReporter()
      : new ProgressReporter(
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
      await cmd.deployPlatformModules(mode, opts.module);
    }

    platformProgress.done();
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
    args.push("--auto-approve");
  }

  return factory.buildTerragrunt(args);
}
