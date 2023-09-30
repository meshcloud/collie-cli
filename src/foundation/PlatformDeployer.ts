import * as path from "std/path";

import {
  TerragruntArguments,
  TerragruntCliFacade,
  toVerb,
} from "/api/terragrunt/TerragruntCliFacade.ts";
import { FoundationRepository } from "/model/FoundationRepository.ts";
import { PlatformConfig } from "/model/PlatformConfig.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "/cli/ProgressReporter.ts";
import { CollieRepository } from "/model/CollieRepository.ts";

export class PlatformDeployer<T extends PlatformConfig> {
  constructor(
    protected readonly platform: T,
    private readonly repo: CollieRepository,
    protected readonly foundation: FoundationRepository,
    private readonly terragrunt: TerragruntCliFacade,
    private readonly logger: Logger,
  ) {}

  async deployBootstrapModules(
    mode: TerragruntArguments,
    autoApprove: boolean,
  ) {
    const moduleDir = this.bootstrapModuleDir();
    const bootstrapModuleProgress = this.buildProgressReporter(
      mode,
      this.repo.relativePath(moduleDir),
    );

    await this.terragrunt.run(moduleDir, mode, { autoApprove });

    bootstrapModuleProgress.done();
  }

  private bootstrapModuleDir() {
    return this.foundation.resolvePlatformPath(this.platform, "bootstrap");
  }

  async deployPlatformModules(
    mode: TerragruntArguments,
    module: string | undefined,
    autoApprove: boolean,
  ) {
    const platformOrModulePath = this.foundation.resolvePlatformPath(
      this.platform,
      module || "",
    );

    const relativePlatformOrModulePath = this.repo.relativePath(
      platformOrModulePath,
    );

    const progress = this.buildProgressReporter(
      mode,
      relativePlatformOrModulePath,
    );

    const tgfiles = await this.terragruntFiles(relativePlatformOrModulePath);
    if (tgfiles.length === 0) {
      this.logger.warn(
        (fmt) =>
          `detected no platform modules at ${
            fmt.kitPath(
              platformOrModulePath,
            )
          }, will skip invoking "terragrunt <cmd>"`,
      );

      this.logger.tipCommand(
        "Apply a kit module to this platform to create a platform module using",
        "kit apply",
      );
    } else if (tgfiles.length === 1) {
      // we can't run terragrunt in the platform dir, so we have to infer the platformModule path from
      // the discovered terragrunt file
      const singleModulePath = path.dirname(tgfiles[0].path);

      this.logger.debug(
        (fmt) =>
          `detected a single platform module at ${
            fmt.kitPath(
              singleModulePath,
            )
          }, will deploy with "terragrunt <cmd>"`,
      );
      await this.terragrunt.run(singleModulePath, mode, { autoApprove });
    } else {
      this.logger.debug(
        (fmt) =>
          `detected a stack of platform modules at ${
            fmt.kitPath(
              platformOrModulePath,
            )
          }, will deploy with "terragrunt run-all <cmd>"`,
      );

      await this.terragrunt.runAll(platformOrModulePath, mode, {
        excludeDirs: [this.bootstrapModuleDir()],
        autoApprove,
      });
    }

    progress.done();
  }

  private async terragruntFiles(relativeModulePath: string) {
    const files = await this.repo.processFilesGlob(
      `${relativeModulePath}/**/terragrunt.hcl`,
      (file) => file,
    );

    // a terragrunt stack conists of multiple executable terragrunt files
    return files;
  }

  private buildProgressReporter(mode: TerragruntArguments, id: string) {
    return new ProgressReporter(toVerb(mode), id, this.logger);
  }
}
