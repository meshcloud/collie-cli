import * as path from "std/path";
import { chunk } from "std/collections/chunk";
import { TerragruntCliFacade } from "../api/terragrunt/TerragruntCliFacade.ts";
import { KitModuleDependency } from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { Logger } from "../cli/Logger.ts";
import { MeshError } from "../errors.ts";

export interface PlatformModuleOutputCollector {
  getOutput(dep: KitModuleDependency): Promise<string>;
}

interface PlatformModuleOutput {
  module: string;
  output: string;
}

export class RunAllPlatformModuleOutputCollector
  implements PlatformModuleOutputCollector {
  private modules: PlatformModuleOutput[] = [];

  constructor(
    private readonly terragrunt: TerragruntCliFacade,
    private readonly logger: Logger,
  ) {}

  async initialize(platformPath: string) {
    const result = await this.terragrunt.collectOutputs(
      platformPath,
      "documentation_md",
    );

    if (!result.status.success) {
      this.logger.error(
        (fmt) =>
          `Failed to collect output "documentation_md" from platform ${
            fmt.kitPath(
              platformPath,
            )
          }`,
      );
      this.logger.error(result.stderr);

      throw new MeshError(
        "Failed to collect documentation output from platform modules",
      );
    }

    this.modules = RunAllPlatformModuleOutputCollector.parseTerragrunt(
      result.stdout,
    );
  }

  // deno-lint-ignore require-await
  async getOutput(dep: KitModuleDependency): Promise<string> {
    const platformModulePath = path.dirname(dep.sourcePath);
    const module = this.modules.find((x) =>
      platformModulePath.endsWith(x.module)
    );

    if (!module) {
      throw new MeshError(
        "Failed to find documentation output from platform module " +
          platformModulePath,
      );
    }
    return module?.output;
  }

  public static parseTerragrunt(stdout: string): PlatformModuleOutput[] {
    const regex = /^--- BEGIN COLLIE PLATFORM MODULE OUTPUT: (.+) ---$/gm;

    const sections = stdout.split(regex);
    const cleanedSections = sections
      .map((x) => x.trim())
      .filter((x) => x !== "");

    return chunk(cleanedSections, 2).map(([module, output]) => ({
      module,
      output,
    }));
  }
}

export class RunIndividualPlatformModuleOutputCollector
  implements PlatformModuleOutputCollector {
  constructor(
    private readonly repo: CollieRepository,
    private readonly terragrunt: TerragruntCliFacade,
    private readonly logger: Logger,
  ) {}

  async getOutput(dep: KitModuleDependency): Promise<string> {
    const result = await this.terragrunt.collectOutput(
      this.repo.resolvePath(path.dirname(dep.sourcePath)),
      "documentation_md",
    );

    if (!result.status.success) {
      this.logger.error(
        (fmt) =>
          `Failed to collect output "documentation_md" from platform module ${
            fmt.kitPath(
              dep.sourcePath,
            )
          }`,
      );
      this.logger.error(result.stderr);

      throw new MeshError(
        "Failed to collect documentation output from platform modules",
      );
    }

    return result.stdout;
  }
}
