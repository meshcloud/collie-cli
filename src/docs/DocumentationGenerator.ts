import { ComplianceDocumentationGenerator } from "./ComplianceDocumentationGenerator.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";
import { KitModuleDocumentationGenerator } from "./KitModuleDocumentationGenerator.ts";
import { PlatformDocumentationGenerator } from "./PlatformDocumentationGenerator.ts";
import { VuepressDocumentationSiteGenerator } from "./VuepressDocumentationSiteGenerator.ts";

export class DocumentationGenerator {
  constructor(
    private readonly siteGenerator: VuepressDocumentationSiteGenerator,
    private readonly kitModuleDocumentation: KitModuleDocumentationGenerator,
    private readonly complianceDocumentation: ComplianceDocumentationGenerator,
    private readonly platformDocumentation: PlatformDocumentationGenerator,
  ) {}

  async generateFoundationDocumentation(docsRepo: DocumentationRepository) {
    await this.siteGenerator.generateSite(docsRepo);

    // todo: can we flatten the duplicate docs/ folder nesting?
    await this.complianceDocumentation.generate(docsRepo);
    await this.kitModuleDocumentation.generate(docsRepo);
    await this.platformDocumentation.generate(docsRepo);
  }
}
