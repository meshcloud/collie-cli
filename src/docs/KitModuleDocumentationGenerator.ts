import * as fs from "std/fs";
import * as path from "std/path";
import { TerraformDocsCliFacade } from "../api/terraform-docs/TerraformDocsCliFacade.ts";

import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import { ComplianceControlRepository } from "../compliance/ComplianceControlRepository.ts";
import { KitModuleRepository } from "../kit/KitModuleRepository.ts";
import { ParsedKitModule } from "../kit/ParsedKitModule.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";

export class KitModuleDocumentationGenerator {
  constructor(
    private readonly collie: CollieRepository,
    private readonly kitModules: KitModuleRepository,
    private readonly controls: ComplianceControlRepository,
    private readonly tfdocs: TerraformDocsCliFacade,
    private readonly logger: Logger,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    const kitModulesDir = this.collie.resolvePath("kit");

    const progress = new ProgressReporter(
      "generating",
      "kit module documentation",
      this.logger,
    );

    // generate all kit module READMEs
    const tasks = this.kitModules.all.map(async (x) => {
      const dest = docsRepo.kitModulePath(x.id);

      this.logger.verbose((fmt) => `generating ${fmt.kitPath(dest)}`);

      const md = await this.generateModuleDocumentation(x, docsRepo);

      await Deno.mkdir(path.dirname(dest), { recursive: true });
      await Deno.writeTextFile(dest, md);
    });

    tasks.push(this.copyTopLevelKitReamde(kitModulesDir, docsRepo.kitDir));

    await Promise.all(tasks);

    progress.done();
  }

  private async copyTopLevelKitReamde(
    kitModulesDir: string,
    docsKitDir: string,
  ) {
    const source = path.join(kitModulesDir, "README.md");
    const dest = path.join(docsKitDir, "README.md");
    await Deno.mkdir(path.dirname(dest), { recursive: true });
    await fs.copy(source, dest, { overwrite: true });
  }

  private async generateModuleDocumentation(
    parsed: ParsedKitModule,
    docsRepo: DocumentationRepository,
  ) {
    await this.tfdocs.updateReadme(parsed.kitModulePath);

    const complianceStatements = this.generateComplianceStatements(
      parsed,
      docsRepo,
    );

    if (!complianceStatements?.length) {
      return parsed.readme; // return verbatim
    }

    return `${parsed.readme}
    
## Compliance Statements

${complianceStatements.filter((x) => !!x).join("\n")}
`;
  }

  private generateComplianceStatements(
    parsed: ParsedKitModule,
    docsRepo: DocumentationRepository,
  ) {
    return parsed.kitModule.compliance?.map((x) => {
      const control = this.controls.tryFindById(x.control);
      if (!control) {
        console.log(parsed);
        this.logger.warn(
          `could not find compliance control ${x.control} referenced in a compliance statement in ${parsed.definitionPath}`,
        );

        return;
      }

      return `
### ${control.name}

${x.statement}

[${control.name}](${
        docsRepo.controlLink(
          docsRepo.kitModulePath(parsed.id),
          x.control,
        )
      })
`;
    });
  }
}
