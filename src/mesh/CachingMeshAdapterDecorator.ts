import { Logger } from "../cli/Logger.ts";
import { moment } from "../deps.ts";
import { MeshError } from "../errors.ts";
import { CollieCacheConfig } from "../model/CollieCacheConfig.ts";
import { MeshAdapter } from "./MeshAdapter.ts";
import { MeshTenant } from "./MeshTenantModel.ts";
import { MeshTenantRepository } from "./MeshTenantRepository.ts";
import { Meta } from "./Meta.ts";

/**
 * This adapter will try to fetch tenant data first from the local cache before
 * it hits the real cloud platforms.
 */
export class CachingMeshAdapterDecorator implements MeshAdapter {
  constructor(
    private readonly repository: MeshTenantRepository,
    private readonly meshAdapter: MeshAdapter,
    private readonly config: CollieCacheConfig,
    private readonly logger: Logger,
  ) {}

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    await this.meshAdapter.updateMeshTenant(updatedTenant, originalTenant);
    this.repository.save(updatedTenant);
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    // Update meta info
    const { isCacheUpToDate, meta } = await this.isTenantCollectionCached();
    if (isCacheUpToDate) {
      this.logVerbose(
        () => "tenant cache is up to date  - fetching tenants from cache...",
      );

      return await this.repository.loadTenants();
    }

    this.logVerbose(
      () => "tenant cache has expired  - fetching tenants from cloud...",
    );

    const tenants = await this.meshAdapter.getMeshTenants();

    const cachedTenantsById = await this.getCachedTenantsMappedById();

    // Transfer cost & IAM data from cached repo tenants to new collected tenants.
    for (const t of tenants) {
      const ct = cachedTenantsById.get(t.platformTenantId);
      if (ct) {
        t.costs.push(...ct.costs);
        t.roleAssignments.push(...ct.roleAssignments);
      }
      this.repository.save(t);
    }

    // note: by now we may have new tenants who are missing cost and role assignment data
    // this is fine since all consumers of the MeshAdapter will call attachTenantCosts or attachTenantRoleAssignments
    // anyway

    // Update meta info.
    const updatedMeta = meta || {
      version: 1,
      tenantCollection: {
        lastCollection: "",
      },
    };

    updatedMeta.tenantCollection.lastCollection = new Date().toISOString();

    await this.repository.saveMeta(updatedMeta);

    return tenants;
  }

  private async isTenantCollectionCached() {
    const meta = await this.repository.tryLoadMeta();

    if (!meta?.tenantCollection) {
      return { isCacheUpToDate: false, meta: undefined };
    }

    return {
      isCacheUpToDate: this.isCacheUpToDate(
        meta.tenantCollection.lastCollection,
      ),
      meta,
    };
  }

  public async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const { isCacheUpToDate, meta } = await this.isTenantCollectionCached();
    if (!isCacheUpToDate || !meta) {
      // !meta is required here because sadly typescript isn't smart enough to infer that isCacheUpToDate = true means meta will always be truthy as well
      throw new MeshError(
        "Tenants are not cached, but required for attaching tenant costs. Please clear cache and retry.",
      );
    }

    const isCostCacheUpToDate = await this.isTenantCostCached(
      startDate,
      endDate,
      meta,
    );

    const entries = isCostCacheUpToDate &&
      (await this.loadCacheEntries(tenants));

    if (entries) {
      this.logVerbose(
        () => "costs cache is up to date  - fetching costs from cache...",
      );

      for (const t of tenants) {
        const cached = entries.get(t.platformTenantId);
        if (!cached) {
          // Todo: could possibly refactor this by making loadCacheEntries return a better mapping
          this.throwUnexpectedMissingCacheEntry(t);
        }

        t.costs = [...cached.costs];
      }
    } else {
      this.logVerbose(
        () => "costs cache has expired  - fetching costs from cloud...",
      );

      // load new and set cache
      await this.meshAdapter.attachTenantCosts(tenants, startDate, endDate);

      const tasks = tenants.map((t) => this.repository.save(t));
      await Promise.all(tasks);

      meta.costCollection = {
        from: moment(startDate).format("YYYY-MM-DD"),
        to: moment(endDate).format("YYYY-MM-DD"),
      };

      await this.repository.saveMeta(meta);
    }
  }

  private isTenantCostCached(
    startDate: Date,
    endDate: Date,
    meta: Meta,
  ): boolean {
    if (!meta.costCollection) {
      return false;
    }

    const metaFrom = meta.costCollection.from;
    const metaTo = meta.costCollection.to;

    const isPossibleCached =
      metaFrom === moment(startDate).format("YYYY-MM-DD") &&
      metaTo == moment(endDate).format("YYYY-MM-DD");

    return isPossibleCached;
  }

  public async attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void> {
    const { isCacheUpToDate, meta } = await this.isTenantCollectionCached();
    if (!isCacheUpToDate || !meta) {
      // !meta is required here because sadly typescript isn't smart enough to infer that isCacheUpToDate = true means meta will always be truthy as well
      throw new MeshError(
        "Tenants are not cached, but required for attaching tenant costs. Please clear cache and retry.",
      );
    }

    const isIamCacheUpToDate = await this.isIamCollectionCached(meta);

    const entries = isIamCacheUpToDate &&
      (await this.loadCacheEntries(tenants));

    if (entries) {
      this.logVerbose(
        () => "IAM cache is up to date  - fetching costs from cache...",
      );

      for (const t of tenants) {
        const cached = entries.get(t.platformTenantId);
        if (!cached) {
          this.throwUnexpectedMissingCacheEntry(t);
        }
        t.roleAssignments = [...cached.roleAssignments];
      }
    } else {
      this.logVerbose(
        () =>
          "IAM cache has expired  - fetching role assignments from cloud...",
      );
      await this.meshAdapter.attachTenantRoleAssignments(tenants);

      const tasks = tenants.map((x) => this.repository.save(x));
      await Promise.all(tasks);

      meta.iamCollection = { lastCollection: new Date().toISOString() };
      await this.repository.saveMeta(meta);
    }
  }

  private isIamCollectionCached(meta: Meta) {
    if (!meta.iamCollection) {
      return false;
    }

    return this.isCacheUpToDate(meta.iamCollection.lastCollection);
  }

  private isCacheUpToDate(lastCollectionDate: string) {
    const now = Date.now();
    const lastCollection = Date.parse(lastCollectionDate);

    const age = now - lastCollection;

    const evictionDelayMs = this.config.maxAgeSeconds * 1000;

    this.logDebug(
      () =>
        `testing cache if cache is up to date, last collection was at ${lastCollectionDate}, cache age is ${age}ms`,
    );

    const result = age <= evictionDelayMs;

    return result;
  }

  private async loadCacheEntries(tenants: MeshTenant[]) {
    const cachedTenants = await this.getCachedTenantsMappedById();

    const notCachedTenants = tenants.find(
      (x) => !cachedTenants.has(x.platformTenantId),
    );

    if (notCachedTenants) {
      return false;
    }

    return cachedTenants;
  }

  private async getCachedTenantsMappedById(): Promise<Map<string, MeshTenant>> {
    const cachedTenants = await this.repository.loadTenants();
    const cachedTenantsById = new Map<string, MeshTenant>();

    cachedTenants.forEach((ct) =>
      cachedTenantsById.set(ct.platformTenantId, ct)
    );

    return cachedTenantsById;
  }

  private throwUnexpectedMissingCacheEntry(t: MeshTenant): never {
    throw new MeshError(
      `The tenant ${t.platformTenantName} (${t.platformTenantId}) was missing in the cache. Please clear the cache and retry.`,
    );
  }

  private logVerbose(log: () => string) {
    this.logger.verbose(
      (fmt) =>
        `tenant repository ${fmt.kitPath(this.repository.repoDir)} ${log()}`,
    );
  }

  private logDebug(log: () => string) {
    this.logger.debug(
      (fmt) =>
        `tenant repository ${fmt.kitPath(this.repository.repoDir)} ${log()}`,
    );
  }
}
