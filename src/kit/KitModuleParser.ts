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
import { KitModule } from "./KitModule.ts";
import { ParsedKitModule } from "./ParsedKitModule.ts";

export class KitModuleParser {
  constructor(
    private readonly repo: CollieRepository,
    private readonly validator: ModelValidator,
    private readonly logger: Logger,
  ) {}

  public async load() {
    const dir = this.repo.resolvePath("kit");

    const progress = new ProgressReporter(
      "parsing",
      "kit modules",
      this.logger,
    );

    const q = [];
    for await (
      const file of fs.expandGlob("**/README.md", {
        root: dir,
        exclude: [
          "README.md", // exclude top-level readme
          "**/modules", // exclude sub-modules
        ],
        globstar: true,
      })
    ) {
      q.push(this.parseKitModule(file.path));
    }

    const modules = await Promise.all(q);

    progress.done();

    return modules;
  }

  private async parseKitModule(readmePath: string) {
    const parsedModule = await this.tryParseKitModule(readmePath);

    if (!parsedModule) {
      return;
    }

    return this.validateKitModule(parsedModule);
  }

  private async tryParseKitModule(readmePath: string) {
    const modulePath = path.dirname(readmePath);
    const id = this.repo.relativePath(modulePath);
    const relativeReadmePath = this.repo.relativePath(readmePath);

    this.logger.verbose(
      () => `parsing kit module ${id} via ${relativeReadmePath}`,
    );

    const text = await Deno.readTextFile(readmePath);
    const document = MarkdownDocument.parse<KitModule>(text);

    if (!document) {
      this.logger.warn(
        "Invalid YAML frontmatter in kit module at " + relativeReadmePath,
      );

      return;
    }

    return {
      id: id.substring("kit/".length),
      definitionPath: relativeReadmePath,
      kitModule: document.frontmatter,
      readme: document.document,
    };
  }

  private validateKitModule(parsed: {
    id: string;
    definitionPath: string;
    kitModule: Partial<KitModule>;
  }) {
    const { errors } = this.validator.validateKitModule(parsed.kitModule);

    if (errors) {
      throw new CollieModelValidationError(
        "Invalid kit module at " +
          this.repo.relativePath(parsed.definitionPath),
        errors,
      );
    }

    return parsed as ParsedKitModule;
  }
}
