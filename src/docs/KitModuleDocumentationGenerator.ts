import * as fs from "std/fs";
import * as path from "std/path";

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
    private readonly logger: Logger,
  ) {}

  async generate(docsRepo: DocumentationRepository) {
    const progress = new ProgressReporter(
      "generating",
      "kit module documentation",
      this.logger,
    );

    // generate all kit module READMEs
    const tasks = this.kitModules.all.map(async (x) => {
      const dest = docsRepo.resolveKitModulePath(x.id);

      this.logger.verbose((fmt) => `generating ${fmt.kitPath(dest)}`);

      const md = this.generateModuleDocumentation(x, docsRepo);

      await Deno.mkdir(path.dirname(dest), { recursive: true });
      await Deno.writeTextFile(dest, md);
    });

    tasks.push(this.copyTopLevelKitReamde(docsRepo));

    await Promise.all(tasks);

    progress.done();
  }

  private async copyTopLevelKitReamde(docsRepo: DocumentationRepository) {
    const source = this.collie.resolvePath("kit", "README.md");
    const dest = docsRepo.resolveKitModulePath("README");
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(source, dest, { overwrite: true });
  }

  private generateModuleDocumentation(
    parsed: ParsedKitModule,
    docsRepo: DocumentationRepository,
  ) {
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
          docsRepo.resolveKitModulePath(parsed.id),
          x.control,
        )
      })
`;
    });
  }
}
