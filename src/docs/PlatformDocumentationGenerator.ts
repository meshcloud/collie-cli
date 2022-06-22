import { Dir, DirectoryGenerator, File } from "../cli/DirectoryGenerator.ts";
import { Logger } from "../cli/Logger.ts";
import { ComplianceControlRepository } from "../compliance/ComplianceControlRepository.ts";
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
    private readonly controls: ComplianceControlRepository,
    private readonly kitDependencyAnalyzer: KitDependencyAnalyzer,
    private readonly dir: DirectoryGenerator,
    private readonly logger: Logger,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    const d: Dir = {
      name: "",
      entries: [
        { name: "README.md", content: this.generateFoundationReadme() },
        {
          name: docsRepo.platformsDir,
          entries: [
            { name: "README.md", content: this.generatePlatformsReadme() },
            ...(await this.generatePlatformDocumentations(docsRepo)),
          ],
        },
      ],
    };

    await this.dir.write(d, docsRepo.docsContentPath);
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
    dep: KitModuleDependency,
    docsRepo: DocumentationRepository,
    platform: PlatformConfig,
  ): string {
    if (!dep.kitModule) {
      return MarkdownUtils.container(
        "warning",
        "Invalid Kit Module Dependency",
        "Could not find kit module at " + MarkdownUtils.code(dep.kitModulePath),
      );
    }
    const platformPath = docsRepo.platformPath(platform.id);

    const complianceStatements = dep.kitModule.compliance
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
            platformPath,
            x.control,
          )
        }): ${x.statement}`;
      })
      .filter((x): x is string => !!x);

    const complianceStatementsBlock = !complianceStatements?.length ? "" : `
::: details Compliance Statements
${complianceStatements.join("\n")}
:::
`;

    const kitModuleLink = MarkdownUtils.link(
      dep.kitModule.name + " kit module",
      docsRepo.kitModuleLink(platformPath, dep.kitModuleId),
    );

    return `## ${dep.kitModule.name}

::: tip Kit module
The ${kitModuleLink} ${dep.kitModule.summary}
:::
  
${
      complianceStatementsBlock ||
      `<!-- kit module has no compliance statements -->`
    }

${
      dep.kitModuleOutput ||
      `<!-- did not find output at ${dep.kitModuleOutputPath} -->`
    }
  `;
  }
}
