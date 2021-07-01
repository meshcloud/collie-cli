import { MeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { Meta } from "../db/meta.ts";
import { log, moment } from "../deps.ts";
import { MeshError } from "../errors.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { MeshTenant } from "./mesh-tenant.model.ts";

/**
 * This adapter will try to fetch tenant data first from the local cache before
 * it hits the real cloud platforms.
 */
export class CachingMeshAdapterDecorator implements MeshAdapter {
  constructor(
    private readonly repository: MeshTenantRepository,
    private readonly meshAdapter: MeshAdapter,
  ) {
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    // Update meta info
    if (await this.repository.isTenantCollectionValid()) {
      log.debug("Repository is valid. Fetching tenants from cache.");
      return this.repository.loadTenants();
    } else {
      log.debug(
        "Repository is not valid anymore. Fetching fresh tenants from cloud."
      );
      const tenants = await this.meshAdapter.getMeshTenants();

      const cachedTenants = await this.repository.loadTenants();
      const tenantsById = new Map<string, MeshTenant>();
      cachedTenants.forEach((ct) => tenantsById.set(ct.platformTenantId, ct));

      // Transfer cost data from cached repo tenants to new collected tenants.
      for (const t of tenants) {
        const ct = tenantsById.get(t.platformTenantId);
        if (ct) {
          t.costs.push(...ct.costs);
        }

        this.repository.save(t);
      }

      // Update meta info.
      let meta = await this.repository.loadMeta();
      if (meta == null) {
        meta = this.repository.newMeta();
      } else {
        meta.tenantCollection.lastCollection = new Date().toUTCString();
      }
      this.repository.saveMeta(meta);

      return tenants;
    }
  }

  private async isTenantCostCached(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
    meta: Meta,
  ): Promise<boolean> {
    if (!meta.costCollection) {
      return false;
    }

    const metaFrom = meta.costCollection.from;
    const metaTo = meta.costCollection.to;

    const isPossibleCached =
      metaFrom === moment(startDate).format("YYYY-MM-DD") &&
      metaTo == moment(endDate).format("YYYY-MM-DD");

    if (!isPossibleCached) {
      return false;
    }

    const cachedTenants = await this.repository.loadTenants();
    const cachedLocalIds = new Set(
      cachedTenants.map((x) => x.platformTenantId),
    );
    const notCachedTenants = tenants.filter((x) =>
      !cachedLocalIds.has(x.platformTenantId)
    );

    return notCachedTenants.length == 0;
  }

  async loadTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const meta = await this.repository.loadMeta();

    if (meta == null) {
      throw new MeshError(
        "Cache is missing but is required to load the TenantCosts. Please clear cache and retry.",
      );
    }

    if (
      await this.isTenantCostCached(
        tenants,
        startDate,
        endDate,
        meta,
      )
    ) {
      log.debug("Tenant costs are cached. Fetching current state from cache.");

      // load from cache. This now has a bit of a strange dynamic, as the requested data should already be attached to the tenant
      // as the cache is in a valid state. Just to make less dependent on external call flow we clear and reset the entries here for
      // safety. Maybe in general there is a better way to control this calls.
      const cachedTenants = await this.repository.loadTenants();
      const cachedTenantsById = new Map<string, MeshTenant>();
      cachedTenants.forEach((ct) =>
        cachedTenantsById.set(ct.platformTenantId, ct)
      );

      for (const t of tenants) {
        const cached = cachedTenantsById.get(t.platformTenantId);
        if (!cached) {
          throw new MeshError(
            `The tenant ${t.platformTenantName} (${t.platformTenantId}) was missing in the cache. Please clear the cache and retry.`,
          );
        }
        t.costs = [...cached.costs];
      }
    } else {
      log.debug(
        "Tenant costs are not cached. Fetching current state from cloud.",
      );

      // load new and set cache
      await this.meshAdapter.loadTenantCosts(
        tenants,
        startDate,
        endDate,
      );

      tenants.forEach((t) => this.repository.save(t));

      // TODO possibly do this inside the repository and dont expose the meta data.
      meta.costCollection = {
        from: moment(startDate).format("YYYY-MM-DD"),
        to: moment(endDate).format("YYYY-MM-DD"),
      };
      this.repository.saveMeta(meta);
    }

    return Promise.resolve();
  }

  async loadTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    if (await this.repository.isIamCollectionValid()) {
      const cachedTenants = await this.repository.loadTenants();
      const cachedTenantsById = new Map<string, MeshTenant>();
      cachedTenants.forEach((ct) =>
        cachedTenantsById.set(ct.platformTenantId, ct)
      );

      for (const t of tenants) {
        const cached = cachedTenantsById.get(t.platformTenantId);
        if (!cached) {
          throw new MeshError(
            `The tenant ${t.platformTenantName} (${t.platformTenantId}) was missing in the cache. Please clear the cache and retry.`,
          );
        }
        t.roleAssignments = [...cached.roleAssignments];
      }
    } else {
      log.debug("IAM collection is no longer valid - collecting new role assignments");
      await this.meshAdapter.loadTenantRoleAssignments(tenants);

      for (const t of tenants) {
        this.repository.save(t);
      }

      // Update meta info. TODO handle in repo
      let meta = await this.repository.loadMeta();
      if (meta == null) {
        meta = this.repository.newMeta();
      }
      meta.iamCollection = { lastCollection: new Date().toUTCString() }
      this.repository.saveMeta(meta);
    }
  }
}
