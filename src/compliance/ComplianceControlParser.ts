import * as fs from "std/fs";
import * as path from "std/path";

import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { MarkdownDocument } from "../model/MarkdownDocument.ts";
import {
  CollieModelValidationError,
  ModelValidator,
} from "../model/schemas/ModelValidator.ts";
import { ComplianceControl } from "./ComplianceControl.ts";

// note: this is very much similar to KitModuleParser, maybe there's a common abstraction
// behind that we should use - until then let's wait for rule of three
export class ComplianceControlParser {
  constructor(
    private readonly repo: CollieRepository,
    private readonly validator: ModelValidator,
    private readonly logger: Logger,
  ) {}

  public async load() {
    const dir = this.repo.resolvePath("compliance");

    const progress = new ProgressReporter(
      "parsing",
      "compliance controls",
      this.logger,
    );

    const q = [];
    for await (
      const file of fs.expandGlob("**/*.md", {
        root: dir,
        globstar: true,
      })
    ) {
      const isControl = file.name !== "README.md"; // skip READMEs they're typically not controls but user-provided documentation
      if (isControl) {
        q.push(this.parseComplianceControl(file.path));
      }
    }

    const modules = await Promise.all(q);

    progress.done();

    return modules;
  }

  private async parseComplianceControl(mdPath: string) {
    const parsedControl = await this.tryParseComplianceControl(mdPath);

    if (!parsedControl) {
      return;
    }

    const { errors } = this.validator.validateComplianceControl(
      parsedControl.control,
    );

    if (errors) {
      throw new CollieModelValidationError(
        "Invalid compliance control at " +
          this.repo.relativePath(parsedControl.definitionPath),
        errors,
      );
    }

    return parsedControl;
  }

  private async tryParseComplianceControl(mdPath: string) {
    const relativeMdPath = this.repo.relativePath(mdPath);
    const id = this.toId(relativeMdPath);

    this.logger.verbose(
      () => `parsing compliance control ${id} via ${relativeMdPath}`,
    );

    const text = await Deno.readTextFile(mdPath);

    const parsed = MarkdownDocument.parse<ComplianceControl>(text);
    if (!parsed) {
      this.logger.warn(
        "Invalid YAML frontmatter in compliance control at " + relativeMdPath,
      );
      return;
    }

    return {
      id: id,
      definitionPath: relativeMdPath,
      control: parsed.frontmatter,
    };
  }

  private toId(relativeControlPath: string) {
    const components = path.parse(relativeControlPath);
    return path.join(components.dir, components.name);
  }
}
