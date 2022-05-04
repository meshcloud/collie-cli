import { AwsMeshAdapter } from "/api/aws/AwsMeshAdapter.ts";
import { MultiMeshAdapter } from "./MultiMeshAdapter.ts";
import { GcloudMeshAdapter } from "/api/gcloud/GcloudMeshAdapter.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { TimeWindowCalculator } from "./time-window-calculator.ts";

import { CachingMeshAdapterDecorator } from "./caching-mesh-adapter-decorator.ts";
import { StatsMeshAdapterDecorator } from "./stats-mesh-adapter-decorator.ts";

import {
  QueryStatistics,
  STATS_LAYER_CACHE,
  STATS_LAYER_PLATFORM,
} from "./query-statistics.ts";
import { MeshError } from "../errors.ts";
import { MeshTenantChangeDetector } from "./mesh-tenant-change-detector.ts";
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

  async buildMeshAdapter(
    platforms: PlatformConfig[],
    queryStats: QueryStatistics,
  ): Promise<MeshAdapter> {
    const buildAdapterTasks = platforms.map(async (platform) => {
      const adapter = await this.buildPlatformAdapter(platform);
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

    const platformAdapters = await Promise.all(buildAdapterTasks);

    const cachingMeshAdapter = new MultiMeshAdapter(platformAdapters);

    return new StatsMeshAdapterDecorator(
      cachingMeshAdapter,
      "cache",
      STATS_LAYER_CACHE,
      queryStats,
    );
  }

  // TODO: caching per platform, optimize stats decorator building
  async buildPlatformAdapter(config: PlatformConfig): Promise<MeshAdapter> {
    if ("aws" in config) {
      const aws = await this.facadeFactory.buildAws(config.cli.aws);
      return new AwsMeshAdapter(
        aws,
        config.aws.accountAccessRole,
        this.tenantChangeDetector,
      );
    } else if ("azure" in config) {
      const az = await this.facadeFactory.buildAz(config.cli.az);
      return new AzMeshAdapter(az, this.tenantChangeDetector);
    } else if ("gcp" in config) {
      const gcloud = await this.facadeFactory.buildGcloud(config.cli.gcloud);
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
