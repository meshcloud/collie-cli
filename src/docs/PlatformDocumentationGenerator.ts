import { Dir, DirectoryGenerator, File } from "../cli/DirectoryGenerator.ts";
import { CLI } from "../info.ts";
import {
  KitDependencyAnalyzer,
  KitModuleDependency,
  PlatformDependencies,
} from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import { MarkdownUtils } from "../model/MarkdownUtils.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";

const md = MarkdownUtils;

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
    private readonly dir: DirectoryGenerator,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    const d: Dir = {
      name: docsRepo.contentDir,
      entries: [
        { name: "README.md", content: this.generateFoundationReadme() },
        {
          name: "platforms",
          entries: [
            { name: "README.md", content: this.generatePlatformsReadme() },
            ...(await this.generatePlatformDocumentations(docsRepo)),
          ],
        },
      ],
    };

    await this.dir.write(d, "");
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

  private async generatePlatformDocumentations(
    docsRepo: DocumentationRepository,
  ): Promise<File[]> {
    const foundationDependencies = await this.kitDependencyAnalyzer
      .findKitModuleDependencies(
        this.foundation,
      );

    return foundationDependencies.platforms.map((p) => ({
      name: p.platform.id + ".md",
      content: this.generatePlatforDocumentation(p, docsRepo),
    }));
  }

  private generatePlatformsReadme(): string {
    return `# Introduction

This section describes the platforms.`;
  }

  private generatePlatforDocumentation(
    dependencies: PlatformDependencies,
    docsRepo: DocumentationRepository,
  ): string {
    const platformModuleDescriptions = dependencies.modules
      .sort(kitModuleSorter)
      .map((x) => {
        return this.generatePlatformModuleDocumentation(
          x,
          docsRepo,
          dependencies.platform,
        );
      })
      .join("\n");

    const platformDir = this.kit.relativePath(
      this.foundation.resolvePlatformPath(dependencies.platform),
    );

    return `# ${dependencies.platform.name}

The following section describe the configuration of this cloud platform based on the applied kit modules.
Each section includes a link to the relevant [kit module](/kit/) documentation. Review this documentation to learn more
about the kit module and its [compliance](/compliance/) statements.

${platformModuleDescriptions}

## Discovered dependencies

This documentation was generated based on auto-discovered dependencies of 
${md.code("terragrunt.hcl")} files in ${md.code(platformDir)}.

::: tip
You can review the disocvered dependencies using the ${
      md.code(
        `${CLI} foundation tree`,
      )
    } command.
:::
`;
  }

  private generatePlatformModuleDocumentation(
    x: KitModuleDependency,
    docsRepo: DocumentationRepository,
    platform: PlatformConfig,
  ): string {
    if (!x.kitModule) {
      return MarkdownUtils.container(
        "warning",
        "Invalid Kit Module Dependency",
        "Could not find kit module at " + MarkdownUtils.code(x.kitModulePath),
      );
    }

    return `## ${x.kitModule.name}

  ::: tip Kit module
  The [${x.kitModule.name} kit module](${
      docsRepo.kitModuleLink(
        docsRepo.platformPath(platform.id),
        x.kitModuleId,
      )
    }) ${x.kitModule.summary}
  :::
  
  ${
      x.kitModuleOutput ||
      `<!-- did not find output at ${x.kitModuleOutputPath} -->`
    }
  `;
  }
}
