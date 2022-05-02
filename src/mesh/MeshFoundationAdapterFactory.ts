import { AwsMeshAdapter } from "/api/aws/aws-mesh-adapter.ts";
import { AzureMeshAdapter } from "/api/az/azure-mesh-adapter.ts";
import { MultiMeshAdapter } from "./multi-mesh-adapter.ts";
import { GcpMeshAdapter } from "/api/gcloud/gcp-mesh-adapter.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { TimeWindowCalculator } from "./time-window-calculator.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { CachingMeshAdapterDecorator } from "./caching-mesh-adapter-decorator.ts";
import { StatsMeshAdapterDecorator } from "./stats-mesh-adapter-decorator.ts";
import { MeshPlatform } from "./mesh-tenant.model.ts";
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
  ) {}

  async buildMeshAdapter(queryStats: QueryStatistics): Promise<MeshAdapter> {
    const buildAdapterTasks = this.foundation.platforms.map((x) =>
      this.buildPlatformAdapter(x, queryStats)
    );

    const adapters = await Promise.all(buildAdapterTasks);

    // TODO: change this to cache per platform!

    // There are multiple ways of doing it. Currently we only fetch everything or nothing, which is easier I guess.
    // we could also split every platform into an individual repository folder and perform fetching and caching on a per-platform
    // basis. For now we go with the easier part.
    const tenantRepository = newMeshTenantRepository();

    const cachingMeshAdapter = new CachingMeshAdapterDecorator(
      tenantRepository,
      new MultiMeshAdapter(adapters),
    );

    if (queryStats) {
      return new StatsMeshAdapterDecorator(
        cachingMeshAdapter,
        "cache",
        STATS_LAYER_CACHE,
        queryStats,
      );
    }

    return cachingMeshAdapter;
  }

  // TODO: caching per platform, optimize stats decorator building
  async buildPlatformAdapter(
    config: PlatformConfig,
    queryStats: QueryStatistics,
  ): Promise<MeshAdapter> {
    if ("aws" in config) {
      const aws = await this.facadeFactory.buildAws(config.cli.aws);
      const awsAdapter = new AwsMeshAdapter(
        aws,
        config.aws.accountAccessRole,
        this.tenantChangeDetector,
      );

      return new StatsMeshAdapterDecorator(
        awsAdapter,
        MeshPlatform.AWS, // todo: needs to be per platform instance, not per platform type
        STATS_LAYER_PLATFORM,
        queryStats,
      );
    } else if ("azure" in config) {
      const az = await this.facadeFactory.buildAz(config.cli.az);
      const azureAdapter = new AzureMeshAdapter(az, this.tenantChangeDetector);

      return new StatsMeshAdapterDecorator(
        azureAdapter,
        MeshPlatform.Azure,
        STATS_LAYER_PLATFORM,
        queryStats,
      );
    } else if ("gcp" in config) {
      const gcloud = await this.facadeFactory.buildGcloud(config.cli.gcloud);
      const gcpAdapter = new GcpMeshAdapter(
        gcloud,
        this.timeWindowCalc,
        this.tenantChangeDetector,
      );

      return new StatsMeshAdapterDecorator(
        gcpAdapter,
        MeshPlatform.GCP,
        STATS_LAYER_PLATFORM,
        queryStats,
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
