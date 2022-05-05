import { AwsMeshAdapter } from "/api/aws/AwsMeshAdapter.ts";
import { MultiMeshAdapter } from "./MultiMeshAdapter.ts";
import { GcloudMeshAdapter } from "/api/gcloud/GcloudMeshAdapter.ts";
import { MeshAdapter } from "./MeshAdapter.ts";
import { TimeWindowCalculator } from "./TimeWindowCalculator.ts";

import { CachingMeshAdapterDecorator } from "./CachingMeshAdapterDecorator.ts";
import { StatsMeshAdapterDecorator } from "./StatsMeshAdapterDecorator.ts";

import {
  QueryStatistics,
  STATS_LAYER_CACHE,
  STATS_LAYER_PLATFORM,
} from "./QueryStatistics.ts";
import { MeshError } from "../errors.ts";
import { MeshTenantChangeDetector } from "./MeshTenantChangeDetector.ts";
import { FoundationRepository } from "../model/FoundationRepository.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { CliApiFacadeFactory } from "../api/CliApiFacadeFactory.ts";
import { AzMeshAdapter } from "../api/az/AzMeshAdapter.ts";
import { Logger } from "../cli/Logger.ts";
import { MeshTenantRepository } from "./MeshTenantRepository.ts";

/**
 * Should consume the cli configuration in order to build the
 * proper adapter.
 */
export class MeshFoundationAdapterFactory {
  private readonly timeWindowCalc = new TimeWindowCalculator();
  private readonly tenantChangeDetector = new MeshTenantChangeDetector();

  constructor(
    private readonly collie: CollieRepository,
    private readonly foundation: FoundationRepository,
    private readonly facadeFactory: CliApiFacadeFactory,
    private readonly logger: Logger,
  ) {}

  buildMeshAdapter(
    platforms: PlatformConfig[],
    queryStats: QueryStatistics,
  ): MeshAdapter {
    const platformAdapters = platforms.map((platform) => {
      const adapter = this.buildPlatformAdapter(platform);
      const adapterWithStats = new StatsMeshAdapterDecorator(
        adapter,
        platform.name,
        STATS_LAYER_PLATFORM,
        queryStats,
      );

      const repo = new MeshTenantRepository(
        this.foundation.resolvePlatformPath(platform, "tenants"),
        this.logger,
      );

      const adapterWithCache = new CachingMeshAdapterDecorator(
        repo,
        adapterWithStats,
        this.logger,
      );
      return new StatsMeshAdapterDecorator(
        adapterWithCache,
        "cache", // todo: maybe we need to have a platform(cli/cache) stats reporting instead of a global gache
        STATS_LAYER_CACHE,
        queryStats,
      );
    });

    const cachingMeshAdapter = new MultiMeshAdapter(platformAdapters);

    return new StatsMeshAdapterDecorator(
      cachingMeshAdapter,
      "cache",
      STATS_LAYER_CACHE,
      queryStats,
    );
  }

  // TODO: caching per platform, optimize stats decorator building
  private buildPlatformAdapter(config: PlatformConfig): MeshAdapter {
    if ("aws" in config) {
      const aws = this.facadeFactory.buildAws(config.cli.aws);
      return new AwsMeshAdapter(
        aws,
        config.aws.accountAccessRole,
        this.tenantChangeDetector,
      );
    } else if ("azure" in config) {
      const az = this.facadeFactory.buildAz(config.cli.az);
      return new AzMeshAdapter(az, this.tenantChangeDetector);
    } else if ("gcp" in config) {
      const gcloud = this.facadeFactory.buildGcloud(config.cli.gcloud);
      return new GcloudMeshAdapter(
        gcloud,
        this.timeWindowCalc,
        this.tenantChangeDetector,
      );
    } else {
      throw new MeshError(
        `Invalid platform definition with unknown platform type at ${
          this.collie.relativePath(
            this.foundation.resolvePlatformPath(config),
          )
        }`,
      );
    }
  }
}
