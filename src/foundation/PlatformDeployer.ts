import * as fs from "std/fs";

import {
  Terragrunt,
  TerragruntRunMode,
  toVerb,
} from "/api/terragrunt/Terragrunt.ts";
import { FoundationRepository } from "/model/FoundationRepository.ts";
import {
  PlatformConfig,
  PlatformConfigAws,
  PlatformConfigAzure,
  PlatformConfigGcp,
} from "/model/PlatformConfig.ts";
import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "/cli/ProgressReporter.ts";
import { CollieRepository } from "/model/CollieRepository.ts";

export abstract class PlatformDeployer<T extends PlatformConfig> {
  constructor(
    protected readonly platform: T,
    private readonly repo: CollieRepository,
    protected readonly foundation: FoundationRepository,
    private readonly terragrunt: Terragrunt,
    private readonly logger: Logger,
  ) {}

  async deployBootstrapModules(mode: TerragruntRunMode) {
    const moduleDir = this.foundation.resolvePlatformPath(
      this.platform,
      "bootstrap",
    );
    const bootstrapModuleProgress = this.buildProgressReporter(
      mode,
      this.repo.relativePath(moduleDir),
    );

    await this.terragrunt.run(moduleDir, mode);

    bootstrapModuleProgress.done();
  }

  protected abstract platformModuleSequence(): string[];

  async deployPlatformModules(mode: TerragruntRunMode, module?: string) {
    const platformModuleSequence = module
      ? [module]
      : this.platformModuleSequence();

    for (const p of platformModuleSequence) {
      const modulePath = this.foundation.resolvePlatformPath(this.platform, p);

      const progress = this.buildProgressReporter(
        mode,
        this.repo.relativePath(modulePath),
      );

      if (await this.isTerragruntStack(modulePath)) {
        await this.terragrunt.runAll(modulePath, mode);
      } else {
        await this.terragrunt.run(modulePath, mode);
      }

      progress.done();
    }
  }

  private async isTerragruntStack(modulePath: string) {
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
    return files.length > 1;
  }

  private buildProgressReporter(mode: TerragruntRunMode, id: string) {
    return new ProgressReporter(toVerb(mode), id, this.logger);
  }
}

export class AwsPlatformDeployer extends PlatformDeployer<PlatformConfigAws> {
  protected platformModuleSequence(): string[] {
    return ["admin-accounts"];
  }
}

export class AzurePlatformDeployer
  extends PlatformDeployer<PlatformConfigAzure> {
  protected platformModuleSequence(): string[] {
    return ["admin/tenant"];
  }
}

export class GcpPlatformDeployer extends PlatformDeployer<PlatformConfigGcp> {
  protected platformModuleSequence(): string[] {
    return ["admin"];
  }
}
