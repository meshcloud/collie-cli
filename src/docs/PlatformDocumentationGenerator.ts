import * as fs from "std/fs";
import * as path from "std/path";
import { pooledMap } from "std/async";
import { TerragruntCliFacade } from "../api/terragrunt/TerragruntCliFacade.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import {
  KitDependencyAnalyzer,
  KitModuleDependency,
  PlatformDependencies,
} from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";
import { MarkdownUtils } from "../model/MarkdownUtils.ts";
import { ComplianceControlRepository } from "../compliance/ComplianceControlRepository.ts";

export class PlatformDocumentationGenerator {
  constructor(
    private readonly repo: CollieRepository,
    private readonly foundation: FoundationRepository,
    private readonly kitDependencyAnalyzer: KitDependencyAnalyzer,
    private readonly controls: ComplianceControlRepository,
    private readonly terragrunt: TerragruntCliFacade,
    private readonly logger: Logger,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    await this.copyTopLevelPlatformsReamde(docsRepo);
    await this.generatePlatformsDocumentation(docsRepo);
  }

  private async copyTopLevelPlatformsReamde(docsRepo: DocumentationRepository) {
    const source = this.foundation.resolvePath("platforms", "README.md");
    const dest = docsRepo.resolvePlatformsPath("README.md");

    this.logger.verbose(
      (fmt) => `Copying ${fmt.kitPath(source)} to ${fmt.kitPath(dest)}`,
    );
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(source, dest, { overwrite: true });
  }

  private async generatePlatformsDocumentation(
    docsRepo: DocumentationRepository,
  ) {
    const foundationProgress = new ProgressReporter(
      "generate documentation",
      this.repo.relativePath(this.foundation.resolvePath()),
      this.logger,
    );

    const foundationDependencies = await this.kitDependencyAnalyzer
      .findKitModuleDependencies(
        this.foundation,
      );

    for (const p of foundationDependencies.platforms) {
      await this.generatePlatforDocumentation(p, docsRepo);
    }

    foundationProgress.done();
  }

  private async generatePlatforDocumentation(
    dependencies: PlatformDependencies,
    docsRepo: DocumentationRepository,
  ) {
    const platformPath = this.foundation.resolvePlatformPath(
      dependencies.platform,
    );
    const platformProgress = new ProgressReporter(
      "generate documentation",
      this.repo.relativePath(platformPath),
      this.logger,
    );

    // sadly we can't use terragrunt run-all because we need to collect the output, so we re-implement a simple
    // version of this here

    // groups need to be processed serially or else concurrent terragrunt invocations will step over each other
    // resulting in issues like https://github.com/meshcloud/collie-cli/issues/265

    const groups = await this.terragrunt.moduleGroups(platformPath);

    this.logger.verbose(
      (_) =>
        `generating documentation will process the following groups: ${
          JSON.stringify(groups, null, 2)
        }`,
    );

    for (const group of Object.values(groups)) {
      // within one group, we can run concurrent terragrunt invocations
      const tasks = group.map(
        async (platformModulePath) =>
          await this.generatePlatformModuleDocumentation(
            findDependency(dependencies, platformModulePath),
            docsRepo,
            dependencies.platform,
          ),
      );

      await Promise.all(tasks);
    }

    platformProgress.done();
  }

  private async generatePlatformModuleDocumentation(
    dep: KitModuleDependency,
    docsRepo: DocumentationRepository,
    platform: PlatformConfig,
  ) {
    const destPath = docsRepo.resolvePlatformModulePath(
      platform.id,
      dep.kitModuleId,
    );

    const result = await this.terragrunt.collectOutput(
      this.repo.resolvePath(path.dirname(dep.sourcePath)),
      "documentation_md",
    );

    if (!result.status.success) {
      this.logger.warn(
        (fmt) =>
          `Failed to collect output "documentation_md" from platform module${
            fmt.kitPath(
              dep.sourcePath,
            )
          }`,
      );
      this.logger.warn(result.stderr);
    } else {
      await fs.ensureDir(path.dirname(destPath)); // todo: should we do nesting in the docs output or "flatten" module prefixes?

      const mdSections = [result.stdout];

      const complianceStatementsBlock = this.generateComplianceStatementSection(
        dep,
        docsRepo,
        destPath,
      );
      mdSections.push(complianceStatementsBlock);

      const kitModuleSection = this.generateKitModuleSection(
        dep,
        docsRepo,
        destPath,
      );
      mdSections.push(kitModuleSection);

      await Deno.writeTextFile(destPath, mdSections.join("\n\n"));

      this.logger.verbose(
        (fmt) =>
          `Wrote output "documentation_md" from platform module ${
            fmt.kitPath(
              dep.sourcePath,
            )
          } to ${fmt.kitPath(destPath)}`,
      );
    }
  }

  private generateKitModuleSection(
    dep: KitModuleDependency,
    docsRepo: DocumentationRepository,
    destPath: string,
  ) {
    if (!dep.kitModule) {
      return MarkdownUtils.container(
        "warning",
        "Invalid Kit Module Dependency",
        "Could not find kit module at " + MarkdownUtils.code(dep.kitModulePath),
      );
    }

    const kitModuleLink = MarkdownUtils.link(
      dep.kitModule.name + " kit module",
      docsRepo.kitModuleLink(destPath, dep.kitModuleId),
    );

    const kitModuleSection = `::: tip Kit module
This platform module is a deployment of kit module ${kitModuleLink}.
:::`;
    return kitModuleSection;
  }

  private generateComplianceStatementSection(
    dep: KitModuleDependency,
    docsRepo: DocumentationRepository,
    destPath: string,
  ) {
    const complianceStatements = dep?.kitModule?.compliance
      ?.map((x) => {
        const control = this.controls.tryFindById(x.control);
        if (!control) {
          this.logger.warn(
            `could not find compliance control ${x.control} referenced in a compliance statement in ${dep.kitModulePath}`,
          );

          return;
        }

        return `- [${control.name}](${
          docsRepo.controlLink(
            destPath,
            x.control,
          )
        }): ${x.statement}`;
      })
      .filter((x): x is string => !!x);

    const complianceStatementsBlock = !complianceStatements?.length
      ? `<!-- kit module has no compliance statements -->`
      : `## Compliance Statements

${complianceStatements.join("\n")}`;
    return complianceStatementsBlock;
  }
}

function findDependency(
  dependencies: PlatformDependencies,
  platformModulePath: string,
): KitModuleDependency {
  const dependency = dependencies.modules.find((dep) => {
    const relativePlatformModuleDir = path.dirname(dep.sourcePath);
    platformModulePath.endsWith(relativePlatformModuleDir);
  });

  if (!dependency) {
    throw new Error(
      "Could not find platform module dependency for " + platformModulePath,
    );
  }

  return dependency;
}
