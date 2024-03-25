import {
  TerragruntArguments,
  toVerb,
} from "/api/terragrunt/TerragruntCliFacade.ts";

import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { Logger } from "../../cli/Logger.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { PlatformDeployer } from "../../foundation/PlatformDeployer.ts";
import { PlatformModuleType } from "./PlatformModuleType.ts";
import { CLI } from "../../info.ts";
import { LiteralArgsParser } from "../LiteralArgsParser.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { getCurrentWorkingFoundation } from "../../cli/commandOptionsConventions.ts";
import { findPlatforms } from "./deploy.command.ts";
import { NullProgressReporter } from "../../cli/NullProgressReporter.ts";

interface TestOptions {
  platform?: string;
  module?: string;
}

export function registerTestCmd(program: TopLevelCommand) {
  const cmd = program
    .command("test [foundation:foundation]")
    .description(
      "Run platform test modules in your cloud foundations using terragrunt",
    )
    .type("module", new PlatformModuleType())
    .option(
      "-p, --platform <platform:platform>", // todo: make optional -> deploy all platforms!
      "the platform to test",
    )
    .option("--module <module:module>", "Execute this specific test module")
    .option(
      "-- [args...]",
      "pass the following raw arguments to terragrunt instead of running the default 'test'.",
    )
    .example(
      "Run terraform test on all test modules",
      `${CLI} foundation test myfoundation`,
    )
    .example(
      "Run terraform plan on all modules of a platform",
      `${CLI} foundation test myfoundation --platform aws`,
    )
    .example(
      "Update terraform modules and providers",
      `${CLI} foundation test myfoundation --platform aws --module connectivity.test -- init -upgrade`,
    )
    .action(
      async (
        opts: TestOptions & GlobalCommandOptions,
        foundationArg: string | undefined,
      ) => {
        const literalArgs = LiteralArgsParser.parse(cmd.getRawArgs());

        const collieRepo = await CollieRepository.load();
        const logger = new Logger(collieRepo, opts);
        const validator = new ModelValidator(logger);

        const mode = { raw: literalArgs.length ? literalArgs : ["test"] };

        const foundation = await getCurrentWorkingFoundation(
          foundationArg,
          logger,
          collieRepo,
        );

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

        await testFoundation(collieRepo, foundationRepo, mode, opts, logger);

        foundationProgress.done();
      },
    );
}

export async function testFoundation(
  repo: CollieRepository,
  foundation: FoundationRepository,
  mode: TerragruntArguments,
  opts: GlobalCommandOptions & TestOptions,
  logger: Logger,
) {
  const factory = new CliApiFacadeFactory(logger);

  const terragrunt = factory.buildTerragrunt();

  const platforms = findPlatforms(opts.platform, foundation, logger);

  for (const platform of platforms) {
    const deployer = new PlatformDeployer(
      platform,
      repo,
      foundation,
      terragrunt,
      logger,
    );

    await deployer.runTestModules(mode, opts.module);
  }
}
