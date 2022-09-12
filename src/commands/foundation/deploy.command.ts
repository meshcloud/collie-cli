import {
  TerragruntArguments,
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
      "--auto-approve",
      "auto approve confirmation prompts in underyling terragrunt and terraform commands",
    )
    .option(
      "-- [args...]",
      "pass the following raw arguments to terragrunt instead of running the default 'apply'.",
    )
    .example(
      "Run terraform apply on all modules",
      `${CLI} foundation deploy myfoundation --platform aws`,
    )
    .example(
      "Run terraform plan on all modules",
      `${CLI} foundation deploy myfoundation --platform aws -- plan`,
    )
    .example(
      "Dump terraform state for a specific module",
      `${CLI} foundation deploy myfoundation --platform aws --module admin/root -- state pull`,
    )
    .example(
      "Import a resource into terraform state",
      `${CLI} foundation deploy myfoundation --platform aws --module admin/root -- import aws_organizations_account.root 123456789012`,
    )
    .example(
      "Update terraform modules and providers",
      `${CLI} foundation deploy myfoundation --platform aws --module admin/root -- init -upgrade`,
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

        const mode = { raw: literalArgs.length ? literalArgs : ["apply"] };

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
        await deployFoundation(collieRepo, foundationRepo, mode, opts, logger);

        foundationProgress.done();
      },
    );
}

async function deployFoundation(
  repo: CollieRepository,
  foundation: FoundationRepository,
  mode: TerragruntArguments,
  opts: GlobalCommandOptions & DeployOptions,
  logger: Logger,
) {
  const factory = new CliApiFacadeFactory(repo, logger);

  const terragrunt = factory.buildTerragrunt();

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
      await deployer.deployBootstrapModules(mode, opts.autoApprove);
    } else {
      await deployer.deployPlatformModules(mode, opts.module, opts.autoApprove);
    }
  }
}

/**
 * A null object that allows us to skip reporting for foundation/platform progress when those are not needed
 */
class NullProgressReporter {
  done(): void {}
}
