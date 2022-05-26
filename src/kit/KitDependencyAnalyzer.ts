import * as fs from "std/fs";
import * as path from "std/path";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";
import { KitModuleRepository } from "./KitModuleRepository.ts";
import { KitModule } from "./KitModule.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

export interface FoundationDependencies {
  foundation: string;
  platforms: PlatformDependencies[];
}

export interface PlatformDependencies {
  platform: PlatformConfig;
  modules: KitModuleDependency[];
}

export interface KitModuleDependency {
  /**
   * repository-relative path to the source using the kit module
   */
  sourcePath: string;

  /**
   * id of the kit module
   */
  kitModuleId: string;

  /**
   * if available, the parsed kit module data
   */
  kitModule?: KitModule;

  /**
   * repository-relative path to the kit module output
   */
  kitModuleOutputPath: string;

  /**
   * If available, the output generated from the kit module execution.
   */
  kitModuleOutput?: string;
}

export class KitDependencyAnalyzer {
  constructor(
    private readonly kit: CollieRepository,
    private readonly kitModules: KitModuleRepository,
    private readonly logger: Logger,
  ) {}

  async findKitModuleDependencies(
    foundation: FoundationRepository,
  ): Promise<FoundationDependencies> {
    const platforms: PlatformDependencies[] = [];

    for (const platform of foundation.platforms) {
      const progress = new ProgressReporter(
        `parsing platform modules`,
        this.kit.relativePath(foundation.resolvePlatformPath(platform)),
        this.logger,
      );

      const dir = foundation.resolvePlatformPath(platform, "");

      const q = [];
      for await (
        const file of fs.expandGlob("**/terragrunt.hcl", {
          root: dir,
          exclude: ["**/.terragrunt-cache"],
          globstar: true,
        })
      ) {
        // can't get the exclude option of fs.expandGlob to work correctly, so this is a KISS alternative
        if (!file.path.includes(".terragrunt-cache/")) {
          q.push(this.tryParseDependency(file.path));
        }
      }

      const all = await Promise.all(q);
      platforms.push({
        platform: platform,
        modules: all.filter((x): x is KitModuleDependency => !!x),
      });

      progress.done();
    }

    return {
      foundation: foundation.id,
      platforms,
    };
  }

  async tryParseDependency(
    terragruntFilePath: string,
  ): Promise<KitModuleDependency | undefined> {
    const sourcePath = this.kit.relativePath(terragruntFilePath);

    this.logger.verbose(() => `reading platform module at ${sourcePath}`);

    const hcl = await Deno.readTextFile(terragruntFilePath);

    const kitModuleSource = KitDependencyAnalyzer.parseTerraformSource(hcl);
    if (!kitModuleSource) {
      return;
    }

    const kitModuleId = kitModuleSource.replace("${get_repo_root()}//kit/", "");

    const kitModule = this.kitModules.tryFindById(kitModuleId);

    if (!kitModule) {
      const msg =
        `Could not find kit module with id ${kitModuleId} included from ${sourcePath}`;
      this.logger.warn(msg);
    }

    const { kitModuleOutputPath, kitModuleOutput } = await this.readOutput(
      terragruntFilePath,
      sourcePath,
    );

    return {
      sourcePath,
      kitModuleId,
      kitModule,
      kitModuleOutputPath,
      kitModuleOutput,
    };
  }

  private async readOutput(terragruntFilePath: string, sourcePath: string) {
    // by convention, we generate the output next to the terragrunt.hcl file
    const absoluteKitModuleOutputPath = path.resolve(
      terragruntFilePath,
      "../output.md",
    );
    const kitModuleOutputPath = this.kit.relativePath(
      absoluteKitModuleOutputPath,
    );

    const kitModuleOutput = await this.tryReadFile(absoluteKitModuleOutputPath);
    if (!kitModuleOutput) {
      this.logger.warn(
        `platform module ${sourcePath} did not generate an output.md file at ${kitModuleOutputPath}`,
      );
    } else {
      this.logger.verbose(
        () => `read generated kit module output at ${kitModuleOutputPath}`,
      );
    }
    return { kitModuleOutputPath, kitModuleOutput };
  }

  private async tryReadFile(path: string) {
    try {
      const kitModuleOutput = await Deno.readTextFile(path);
      return kitModuleOutput;
      // deno-lint-ignore no-unused-vars no-empty
    } catch (error) {}
  }

  static parseTerraformSource(hcl: string): string | undefined {
    const regex = /terraform {[\s\S]+source = "([\s\S]+?)"/g;
    const matches = [...hcl.matchAll(regex)];

    return matches[0] && matches[0][1];
  }
}
