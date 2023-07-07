import * as fs from "std/fs";

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
import { toFileUrl } from "https://deno.land/std@0.170.0/path/win32.ts";

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
    const modulePath = this.foundation.resolvePlatformPath(
      this.platform,
      module || "",
    );

    const progress = this.buildProgressReporter(
      mode,
      this.repo.relativePath(modulePath),
    );

    const tgfiles = await this.terragruntFiles(modulePath);
    if (tgfiles.length === 0) {
      this.logger.warn(
        (fmt) =>
          `detected no platform modules at ${
            fmt.kitPath(
              modulePath,
            )
          }, will skip invoking "terragrunt <cmd>"`,
      );

      this.logger.tipCommand(
        "Apply a kit module to this platform to create a platform module using",
        "kit apply",
      );
    } else if (tgfiles.length === 1) {
      this.logger.debug(
        (fmt) =>
          `detected a single platform module at ${
            fmt.kitPath(
              modulePath,
            )
          }, will deploy with "terragrunt <cmd>"`,
      );
      await this.terragrunt.run(modulePath, mode, { autoApprove });
    } else {
      this.logger.debug(
        (fmt) =>
          `detected a stack of platform modules at ${
            fmt.kitPath(
              modulePath,
            )
          }, will deploy with "terragrunt run-all <cmd>"`,
      );

      await this.terragrunt.runAll(modulePath, mode, {
        excludeDirs: [this.bootstrapModuleDir()],
        autoApprove,
      });
    }

    progress.done();
  }

  private async terragruntFiles(modulePath: string) {
    const files = [];

    for await (
      const file of fs.expandGlob("**/terragrunt.hcl", {
        root: modulePath,
        exclude: ["**/.terragrunt-cache"],
        globstar: true,
      })
    ) {
      files.push(file);
    }

    // a terragrunt stack conists of multiple executable terragrunt files
    return files;
  }

  private buildProgressReporter(mode: TerragruntArguments, id: string) {
    return new ProgressReporter(toVerb(mode), id, this.logger);
  }
}
