import * as fs from "std/fs";
import * as path from "std/path";
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

export function kitModuleSorter(
  x: KitModuleDependency,
  y: KitModuleDependency,
): number {
  // bootstrap module always goes first, otherwise sort lexicpgraphically by path
  return x.kitModulePath.endsWith("bootstrap")
    ? -1
    : x.kitModulePath.localeCompare(y.kitModulePath);
}

export class PlatformDocumentationGenerator {
  constructor(
    private readonly kit: CollieRepository,
    private readonly foundation: FoundationRepository,
    private readonly kitDependencyAnalyzer: KitDependencyAnalyzer,
    private readonly logger: Logger,
    private readonly terragrunt: TerragruntCliFacade,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    await this.generatePlatformsDocumentation(docsRepo);
  }

  private generateFoundationReadme() {
    // TODO: replace this with an actual README.md file and then just append the platform links?
    const platformLinks = this.foundation.platforms
      .map((x) => `- [${x.id}](./platforms/${x.id}/README.md)`)
      .join("\n");

    const md = `# Cloud Foundation ${this.foundation.name}

This foundation has the following platforms: 

${platformLinks}
`;

    return md;
  }

  private async generatePlatformsDocumentation(
    docsRepo: DocumentationRepository,
  ) {
    const foundationProgress = new ProgressReporter(
      "generate documentation",
      this.kit.relativePath(this.foundation.resolvePath()),
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

  private generatePlatformsReadme(): string {
    return `# Introduction

This section describes the platforms.`;
  }

  private async generatePlatforDocumentation(
    dependencies: PlatformDependencies,
    docsRepo: DocumentationRepository,
  ) {
    const platformProgress = new ProgressReporter(
      "generate documentation",
      this.kit.relativePath(
        this.foundation.resolvePlatformPath(dependencies.platform),
      ),
      this.logger,
    );

    const tasks = dependencies.modules
      .sort(kitModuleSorter)
      .map(
        async (x) =>
          await this.generatePlatformModuleDocumentation(
            x,
            docsRepo,
            dependencies.platform,
          ),
      );

    await Promise.all(tasks);

    platformProgress.done();
  }

  private async generatePlatformModuleDocumentation(
    x: KitModuleDependency,
    docsRepo: DocumentationRepository,
    platform: PlatformConfig,
  ) {
    // TODO: what about compliance statements?
    const result = await this.terragrunt.collectOutput(
      path.dirname(x.sourcePath),
      "documentation_md",
    );

    if (!result.status.success) {
      this.logger.warn(
        (fmt) =>
          `Failed to collect output "documentation_md" from platform module${
            fmt.kitPath(
              x.sourcePath,
            )
          }`,
      );
      this.logger.warn(result.stderr);
    } else {
      const destPath = docsRepo.resplvePlatformModulePath(
        platform.id,
        x.kitModuleId,
      );
      await fs.ensureDir(path.dirname(destPath)); // todo: should we do nesting in the docs output or "flatten" module prefixes?
      await Deno.writeTextFile(destPath, result.stdout);
      this.logger.verbose(
        (fmt) =>
          `Wrote output "documentation_md" from platform module ${
            fmt.kitPath(
              x.sourcePath,
            )
          } to ${fmt.kitPath(destPath)}`,
      );
    }
  }
}
