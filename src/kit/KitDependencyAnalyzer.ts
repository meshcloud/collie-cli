import { FoundationRepository } from "../model/FoundationRepository.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";
import { KitModuleRepository } from "./KitModuleRepository.ts";
import { KitModule } from "./KitModule.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { ComplianceControlRepository } from "../compliance/ComplianceControlRepository.ts";

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
   * repository-relative path to the kit module directory
   */
  kitModulePath: string;

  /**
   * if available, the parsed kit module data
   */
  kitModule?: KitModule;
}

export class KitDependencyAnalyzer {
  constructor(
    private readonly collie: CollieRepository,
    private readonly kitModules: KitModuleRepository,
    private readonly complianceControls: ComplianceControlRepository,
    private readonly logger: Logger,
  ) {}

  async findKitModuleDependencies(
    foundation: FoundationRepository,
  ): Promise<FoundationDependencies> {
    const platforms: PlatformDependencies[] = [];

    for (const platform of foundation.platforms) {
      const relativePlatformPath = this.collie.relativePath(
        foundation.resolvePlatformPath(platform),
      );

      const progress = new ProgressReporter(
        `parsing platform modules`,
        relativePlatformPath,
        this.logger,
      );

      const excludes = {
        tenantModules: true,
        testModules: true,
        platformModules: false,
      };
      const q = await this.collie.processFilesGlob(
        `${relativePlatformPath}/**/terragrunt.hcl`,
        (file) => this.tryParseDependency(file.path),
        excludes,
      );

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
    const sourcePath = this.collie.relativePath(terragruntFilePath);

    this.logger.verbose(() => `reading platform module at ${sourcePath}`);

    const hcl = await Deno.readTextFile(terragruntFilePath);

    const kitModuleSource = KitDependencyAnalyzer.parseTerraformSource(hcl);
    if (!kitModuleSource) {
      return;
    }

    const kitModuleId = kitModuleSource.replace("${get_repo_root()}//kit/", "");
    const kitModulePath = this.collie.relativePath(
      this.kitModules.resolvePath(kitModuleId),
    );
    const kitModule = this.kitModules.tryFindById(kitModuleId);

    if (!kitModule) {
      const msg =
        `Could not find kit module with id ${kitModuleId} included from ${sourcePath}`;
      this.logger.warn(msg);
    } else {
      this.validateKitModuleComplianceStatements(kitModule, kitModulePath);
    }

    return {
      sourcePath,
      kitModuleId,
      kitModulePath,
      kitModule,
    };
  }
  validateKitModuleComplianceStatements(
    kitModule: KitModule,
    kitModulePath: string,
  ) {
    (kitModule?.compliance || []).forEach((x) => {
      if (!this.complianceControls.tryFindById(x.control)) {
        this.logger.warn(
          `Could not find compliance control ${x.control} referenced in a compliance statement in ${kitModulePath}`,
        );
      }
    });
  }

  static parseTerraformSource(hcl: string): string | undefined {
    const regex = /terraform {[\s\S]+source = "([\s\S]+?)"/g;
    const matches = [...hcl.matchAll(regex)];

    return matches[0] && matches[0][1];
  }
}
