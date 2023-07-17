import * as fs from "std/fs";
import * as path from "std/path";
import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { DocumentationRepository } from "./DocumentationRepository.ts";

export class ComplianceDocumentationGenerator {
  constructor(
    private readonly collie: CollieRepository,
    private readonly logger: Logger,
  ) {}

  public async generate(docsRepo: DocumentationRepository) {
    const source = this.collie.resolvePath("compliance");

    const destinationDir = docsRepo.resolveCompliancePath();
    this.logger.verbose(
      (fmt) =>
        `copying (recursive) ${fmt.kitPath(source)} to ${
          fmt.kitPath(
            destinationDir,
          )
        }`,
    );
    await Deno.mkdir(path.dirname(destinationDir), { recursive: true });
    await fs.copy(source, destinationDir, { overwrite: true });
  }
}
