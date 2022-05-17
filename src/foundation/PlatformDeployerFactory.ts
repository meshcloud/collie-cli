import { Terragrunt } from "../api/terragrunt/Terragrunt.ts";
import { FoundationRepository } from "../model/FoundationRepository.ts";
import { PlatformConfig, PlatformConfigBase } from "/model/PlatformConfig.ts";
import { Logger } from "../cli/Logger.ts";
import {
  AwsPlatformDeployer,
  AzurePlatformDeployer,
  GcpPlatformDeployer,
} from "./PlatformDeployer.ts";
import { CollieRepository } from "/model/CollieRepository.ts";

export class PlatformDeployerFactory {
  constructor(
    private readonly repo: CollieRepository,
    private readonly foundation: FoundationRepository,
    private readonly terragrunt: Terragrunt,
    private readonly logger: Logger,
  ) {}

  buildDeployer<T extends PlatformConfig>(platform: T) {
    if ("aws" in platform) {
      return new AwsPlatformDeployer(
        platform,
        this.repo,
        this.foundation,
        this.terragrunt,
        this.logger,
      );
    } else if ("azure" in platform) {
      return new AzurePlatformDeployer(
        platform,
        this.repo,
        this.foundation,
        this.terragrunt,
        this.logger,
      );
    } else if ("gcp" in platform) {
      return new GcpPlatformDeployer(
        platform,
        this.repo,
        this.foundation,
        this.terragrunt,
        this.logger,
      );
    } else {
      const base = platform as PlatformConfigBase;
      throw new Error(
        "Could not detect platform type for platform " + base.id,
      );
    }
  }
}
