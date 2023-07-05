import * as fs from "std/fs";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import { ComplianceDocumentationGenerator } from "../../docs/ComplianceDocumentationGenerator.ts";
import { DocumentationGenerator } from "../../docs/DocumentationGenerator.ts";
import { DocumentationRepository } from "../../docs/DocumentationRepository.ts";
import { KitModuleDocumentationGenerator } from "../../docs/KitModuleDocumentationGenerator.ts";
import { PlatformDocumentationGenerator } from "../../docs/PlatformDocumentationGenerator.ts";
import { KitDependencyAnalyzer } from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";

interface DocsCommandOptions {
  update?: boolean;
  preview?: boolean;
}

export function registerDocsCmd(program: TopLevelCommand) {
  program
    .command("docs <foundation:foundation>")
    .description(
      "Generate end-user friendly documentation for your cloud foundation",
    )
    .action(
      async (
        opts: GlobalCommandOptions & DocsCommandOptions,
        foundation: string,
      ) => {
        const repo = await CollieRepository.load();
        const logger = new Logger(repo, opts);
        const validator = new ModelValidator(logger);

        const foundationRepo = await FoundationRepository.load(
          repo,
          foundation,
          validator,
        );

        const factory = new CliApiFacadeFactory(repo, logger);
        // todo: instead of flags, maybe these should be subcommands?
        if (opts.update) {
          await updateDocumentation(repo, foundationRepo, logger);
        }

        if (opts.preview) {
          await previewDocumentation(foundationRepo, factory);
        }
      },
    )
    .option("--update [update:boolean]", "Update auto-generated docs.", {
      default: true,
    })
    .option(
      "--preview [preview:boolean]",
      "Start a local web-server preview.",
      {
        default: false,
      },
    );
}

async function updateDocumentation(
  repo: CollieRepository,
  foundation: FoundationRepository,
  logger: Logger,
) {
  const foundationProgress = new ProgressReporter(
    "generating docs",
    `foundation "${foundation.name}"`,
    logger,
  );

  const dir = new DirectoryGenerator(WriteMode.overwrite, logger);

  const validator = new ModelValidator(logger);
  const modules = await KitModuleRepository.load(repo, validator, logger);
  const controls = await ComplianceControlRepository.load(
    repo,
    validator,
    logger,
  );
  const moduleDocumentation = new KitModuleDocumentationGenerator(
    repo,
    modules,
    controls,
    logger,
  );

  const complianceDocumentation = new ComplianceDocumentationGenerator(
    repo,
    logger,
  );

  const analyzer = new KitDependencyAnalyzer(repo, modules, logger);
  const platformDocumentation = new PlatformDocumentationGenerator(
    repo,
    foundation,
    controls,
    analyzer,
    dir,
    logger,
  );

  const docsRepo = new DocumentationRepository(foundation);

  await prepareSiteTemplate(docsRepo, repo, logger);

  const generator = new DocumentationGenerator(
    moduleDocumentation,
    complianceDocumentation,
    platformDocumentation,
  );

  await generator.generateFoundationDocumentation(docsRepo);

  foundationProgress.done();
}

async function previewDocumentation(
  foundation: FoundationRepository,
  factory: CliApiFacadeFactory,
) {
  const docsRepo = new DocumentationRepository(foundation);
  const dir = foundation.resolvePath(docsRepo.docsRootDir);

  const npm = factory.buildNpm();

  await npm.run(["install"], { cwd: dir });
  await npm.run(["run", "docs:dev"], { cwd: dir });
}

async function prepareSiteTemplate(
  docsRepo: DocumentationRepository,
  repo: CollieRepository,
  logger: Logger,
) {
  // TODO: throw if it doesn't work
  const srcDir = repo.resolvePath("kit", "foundation", "docs", "template");

  try {
    await fs.copy(srcDir, docsRepo.docsRootPath, { overwrite: true });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      logger.error(
        (fmt) =>
          `could not find required kit module foundation/docs at ${
            fmt.kitPath(
              srcDir,
            )
          }`,
      );

      logger.tipCommand(
        "To import this module run",
        "kit import foundation/docs ",
      );
      Deno.exit(1);
    }
    throw e;
  }
}
