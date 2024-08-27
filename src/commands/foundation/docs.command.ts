import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { Logger } from "../../cli/Logger.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { DocumentationRepository } from "../../docs/DocumentationRepository.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { getCurrentWorkingFoundation } from "../../cli/commandOptionsConventions.ts";
import { exists } from "std/fs";

interface DocsCommandOptions {
  update?: boolean;
  preview?: boolean;
  build?: boolean;
}

export function registerDocsCmd(program: TopLevelCommand) {
  program
    .command("docs [foundation:foundation]")
    .description(
      "Generate end-user friendly documentation for your cloud foundation",
    )
    .action(
      async (
        opts: GlobalCommandOptions & DocsCommandOptions,
        foundationArg: string | undefined,
      ) => {
        const repo = await CollieRepository.load();
        const logger = new Logger(repo, opts);
        const validator = new ModelValidator(logger);

        const foundation = await getCurrentWorkingFoundation(
          foundationArg,
          logger,
          repo,
        );

        const foundationRepo = await FoundationRepository.load(
          repo,
          foundation,
          validator,
        );

        const factory = new CliApiFacadeFactory(logger);
        // todo: instead of flags, maybe these should be subcommands?
        if (opts.update) {
          await updateDocumentation(repo, foundationRepo, logger);
        }

        if (opts.build) {
          await buildDocumentation(foundationRepo, factory);
        }

        if (opts.preview) {
          await previewDocumentation(foundationRepo, factory);
        } else {
          logger.tip(
            "re-run with --preview flag to start a local webserver rendering a live preview of your docs",
          );
        }
      },
    )
    .option(
      "--update [update:boolean]",
      "Update markdown documentation for the selected foundation.",
      {
        default: true,
      },
    )
    .option(
      "--preview",
      "Render documentation to HTML using static site generator and start local web-server preview.",
      { conflicts: ["build"] },
    )
    .option(
      "--build",
      "Render documentation to HTML using static site generator.",
      { conflicts: ["preview"] },
    );
}

async function updateDocumentation(
  _repo: CollieRepository,
  foundation: FoundationRepository,
  logger: Logger,
) {
  const docsModulePath = foundation.resolvePath("docs");

  if (!await exists(docsModulePath)) {
    logger.error(
      `Foundation-level docs module at "${docsModulePath}" does not exist.`,
    );
    logger.tip(
      "Import a starter docs module using 'collie kit import docs' command.",
    );
    return;
  }

  const foundationProgress = new ProgressReporter(
    "generating docs",
    `foundation "${foundation.name}"`,
    logger,
  );

  const factory = new CliApiFacadeFactory(logger);
  const terragrunt = factory.buildTerragrunt();

  await terragrunt.run(docsModulePath, { raw: ["apply"] }, {
    autoApprove: true,
  });

  foundationProgress.done();
}

async function previewDocumentation(
  foundation: FoundationRepository,
  factory: CliApiFacadeFactory,
) {
  const docsRepo = new DocumentationRepository(foundation);
  const dir = docsRepo.resolvePath();

  const npm = factory.buildNpm();

  await npm.run(["install"], { cwd: dir });
  await npm.run(["run", "docs:dev"], { cwd: dir });
}

async function buildDocumentation(
  foundation: FoundationRepository,
  factory: CliApiFacadeFactory,
) {
  const docsRepo = new DocumentationRepository(foundation);
  const dir = docsRepo.resolvePath();

  const npm = factory.buildNpm();

  await npm.run(["install"], { cwd: dir });
  await npm.run(["run", "docs:build"], { cwd: dir });
}
