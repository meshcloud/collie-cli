import * as path from "std/path";

import {
  TerragruntArguments,
  TerragruntCliFacade,
  toVerb,
} from "/api/terragrunt/TerragruntCliFacade.ts";
import { FoundationRepository } from "/model/FoundationRepository.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "/cli/ProgressReporter.ts";
import {
  CollieRepository,
  PLATFORM_MODULE_GLOB,
} from "/model/CollieRepository.ts";

export class FoundationDeployer {
  constructor(
    private readonly repo: CollieRepository,
    protected readonly foundation: FoundationRepository,
    private readonly terragrunt: TerragruntCliFacade,
    private readonly logger: Logger,
  ) {}

  async deployFoundationModules(
    mode: TerragruntArguments,
    module: string | undefined,
    autoApprove: boolean,
  ) {
    const foundationOrModulePath = this.foundation.resolvePath(
      module || "",
    );

    const relativePlatformOrModulePath = this.repo.relativePath(
      foundationOrModulePath,
    );

    const progress = this.buildProgressReporter(
      mode,
      relativePlatformOrModulePath,
    );

    const tgfiles = await this.foundationModuleTerragruntFiles(
      relativePlatformOrModulePath,
    );
    if (tgfiles.length === 0) {
      this.logger.warn(
        (fmt) =>
          `detected no foundation modules at ${
            fmt.kitPath(foundationOrModulePath)
          }, will skip invoking "terragrunt <cmd>"`,
      );

      this.logger.tipCommand(
        "Apply a kit module to this foundation to create a foundation module using",
        "kit apply",
      );
    } else if (tgfiles.length === 1) {
      // we can't run terragrunt in the platform dir, so we have to infer the platformModule path from
      // the discovered terragrunt file
      const singleModulePath = path.dirname(tgfiles[0].path);

      this.logger.debug(
        (fmt) =>
          `detected a single foundation module at ${
            fmt.kitPath(singleModulePath)
          }, will deploy with "terragrunt <cmd>"`,
      );
      await this.terragrunt.run(singleModulePath, mode, { autoApprove });
    } else {
      this.logger.debug(
        (fmt) =>
          `detected a stack of foundation modules at ${
            fmt.kitPath(
              foundationOrModulePath,
            )
          }, will deploy with "terragrunt run-all <cmd>"`,
      );

      await this.terragrunt.runAll(foundationOrModulePath, mode, {
        excludeDirs: [PLATFORM_MODULE_GLOB], // if we let terragrunt run a run-all, need to explicitly exclude all platform modules
        autoApprove,
      });
    }

    progress.done();
  }

  private async foundationModuleTerragruntFiles(relativeModulePath: string) {
    const excludes = {
      testModules: true,
      tenantModules: true,
      platformModules: true,
    };

    const files = await this.repo.processFilesGlob(
      // todo: exclude platforms/folder
      `${relativeModulePath}/**/terragrunt.hcl`,
      (file) => file,
      excludes,
    );

    // a terragrunt stack conists of multiple executable terragrunt files
    return files;
  }

  private buildProgressReporter(mode: TerragruntArguments, id: string) {
    return new ProgressReporter(toVerb(mode), id, this.logger);
  }
}
