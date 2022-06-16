import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import { Command } from "../../deps.ts";
import { ComplianceDocumentationGenerator } from "../../docs/ComplianceDocumentationGenerator.ts";
import { DocumentationGenerator } from "../../docs/DocumentationGenerator.ts";
import { KitModuleDocumentationGenerator } from "../../docs/KitModuleDocumentationGenerator.ts";
import { PlatformDocumentationGenerator } from "../../docs/PlatformDocumentationGenerator.ts";
import { VuepressDocumentationSiteGenerator } from "../../docs/VuepressDocumentationSiteGenerator.ts";
import { KitDependencyAnalyzer } from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";

interface DocsCommandOptions {
  update: boolean;
  preview: boolean;
}

export function registerDocsCmd(program: Command) {
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
        const repo = new CollieRepository("./");
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
          await updateDocumentation(repo, foundationRepo, factory, logger);
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
  factory: CliApiFacadeFactory,
  logger: Logger,
) {
  const foundationProgress = new ProgressReporter(
    "generating docs",
    `foundation "${foundation.name}"`,
    logger,
  );

  const dir = new DirectoryGenerator(WriteMode.overwrite, logger);
  const siteGenerator = new VuepressDocumentationSiteGenerator(dir);

  const tfDocs = factory.buildTerraformDocs();
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
    tfDocs,
    logger,
  );

  const complianceDocumentation = new ComplianceDocumentationGenerator(logger);

  const analyzer = new KitDependencyAnalyzer(repo, modules, logger);
  const platformDocumentation = new PlatformDocumentationGenerator(
    repo,
    foundation,
    analyzer,
    dir,
  );

  const generator = new DocumentationGenerator(
    siteGenerator,
    moduleDocumentation,
    complianceDocumentation,
    platformDocumentation,
  );

  await generator.generateFoundationDocumentation(foundation);

  foundationProgress.done();
}

async function previewDocumentation(
  repo: FoundationRepository,
  factory: CliApiFacadeFactory,
) {
  const dir = repo.resolvePath("docs");

  const npm = factory.buildNpm();

  await npm.run(["install"], { cwd: dir });
  await npm.run(["run", "docs:dev"], { cwd: dir });
}
