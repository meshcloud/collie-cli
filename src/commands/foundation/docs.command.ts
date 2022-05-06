import { TerraformDocs } from "../../api/terraform-docs/TerraformDocs.ts";
import { DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import { Command } from "../../deps.ts";
import { DocumentationGenerator } from "../../docs/DocumentationGenerator.ts";
import { KitModuleDocumentationGenerator } from "../../docs/KitModuleDocumentationGenerator.ts";
import { KitDependencyAnalyzer } from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { ProcessResult } from "../../process/ProcessRunnerResult.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { buildTransparentProcessRunner } from "./buildTransparentProcessRunner.ts";

interface DocsCommandOptions {
  update: boolean;
  preview: boolean;
}

export function registerDocsCommand(program: Command) {
  program
    .command("docs <foundation>")
    .description("Manage your cloud foundation docs.")
    .action(
      async (
        opts: CmdGlobalOptions & DocsCommandOptions,
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

        // todo: instead of flags, maybe these should be subcommands?
        if (opts.update) {
          const runner = buildTransparentProcessRunner(logger);
          await updateDocumentation(repo, foundationRepo, runner, logger);
        }

        if (opts.preview) {
          await previewDocumentation(foundationRepo, logger);
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
  runner: IProcessRunner<ProcessResult>,
  logger: Logger,
) {
  const foundationProgress = new ProgressReporter(
    "generating docs",
    `foundation "${foundation.name}"`,
    logger,
  );

  const validator = new ModelValidator(logger);
  const modules = await KitModuleRepository.load(repo, validator, logger);
  const controls = await ComplianceControlRepository.load(
    repo,
    validator,
    logger,
  );

  const analyzer = new KitDependencyAnalyzer(repo, modules, logger);
  const dir = new DirectoryGenerator(WriteMode.overwrite, logger);

  const tfDocs = new TerraformDocs(repo, runner);

  const moduleDocumentation = new KitModuleDocumentationGenerator(
    repo,
    modules,
    controls,
    tfDocs,
    logger,
  );

  const generator = new DocumentationGenerator(
    repo,
    foundation,
    analyzer,
    moduleDocumentation,
    dir,
    logger,
  );

  await generator.generateFoundationDocumentation();

  foundationProgress.done();
}

async function previewDocumentation(
  repo: FoundationRepository,
  logger: Logger,
) {
  const dir = repo.resolvePath("docs");

  const shell = buildTransparentProcessRunner(logger);

  await shell.run(["yarn", "install"], { cwd: dir });
  await shell.run(["yarn", "docs:dev"], { cwd: dir });
}
