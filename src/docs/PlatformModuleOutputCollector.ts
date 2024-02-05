import * as path from "std/path";
import { TerragruntCliFacade } from "../api/terragrunt/TerragruntCliFacade.ts";
import { KitModuleDependency } from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { Logger } from "../cli/Logger.ts";
import { MeshError } from "../errors.ts";

/**
 * Note:
 * For a great UX/DX it's important that running "collie foundation docs" is fast.
 *
 * We have therefore tried speeding it up by collecting output from platform modules in parallel.
 * Unfortunately, it appears that terragrunt does not offer us a good way to reliably get all the outputs from all
 * platform modules, see https://github.com/meshcloud/collie-cli/issues/267
 *
 * This "fast mode" detection also caused other bugs like https://github.com/meshcloud/collie-cli/issues/269
 *
 * In the future, we should maybe investigate cachingas an alternative to parallelization, because usually an engineer
 * would re-run "collie foundation docs" only after changing a specific platform module
 */

export interface PlatformModuleOutputCollector {
  getOutput(dep: KitModuleDependency): Promise<string>;
}

/**
 * Collects platform module output by running each platform module individually in series.
 */
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
