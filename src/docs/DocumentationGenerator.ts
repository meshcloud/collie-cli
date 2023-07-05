import { ComplianceDocumentationGenerator } from "./ComplianceDocumentationGenerator.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";
import { KitModuleDocumentationGenerator } from "./KitModuleDocumentationGenerator.ts";
import { PlatformDocumentationGenerator } from "./PlatformDocumentationGenerator.ts";

export class DocumentationGenerator {
  constructor(
    private readonly kitModuleDocumentation: KitModuleDocumentationGenerator,
    private readonly complianceDocumentation: ComplianceDocumentationGenerator,
    private readonly platformDocumentation: PlatformDocumentationGenerator,
  ) {}

  async generateFoundationDocumentation(docsRepo: DocumentationRepository) {
    // todo: can we flatten the duplicate docs/ folder nesting?
    await this.complianceDocumentation.generate(docsRepo);
    await this.kitModuleDocumentation.generate(docsRepo);
    await this.platformDocumentation.generate(docsRepo);
  }
}
