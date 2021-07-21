import { MeshAdapter } from "./mesh-adapter.ts";
import { MeshPlatform, MeshTenant } from "./mesh-tenant.model.ts";
import { QueryStatistics } from "./query-statistics.ts";

/**
 * This adapter will try to fetch tenant data first from the local cache before
 * it hits the real cloud platforms.
 */
export class StatsMeshAdapterDecorator implements MeshAdapter {
  constructor(
    private readonly meshAdapter: MeshAdapter,
    private readonly platform: MeshPlatform,
  ) {
  }
  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
    stats: QueryStatistics,
  ): Promise<void> {
    return await stats.recordQuery(
      this.platform,
      async () =>
        await this.meshAdapter.attachTenantCosts(
          tenants,
          startDate,
          endDate,
          stats,
        ),
    );
  }

  async attachTenantRoleAssignments(
    tenants: MeshTenant[],
    stats: QueryStatistics,
  ): Promise<void> {
    return await stats.recordQuery(
      this.platform,
      async () =>
        await this.meshAdapter.attachTenantRoleAssignments(tenants, stats),
    );
  }

  async getMeshTenants(stats: QueryStatistics): Promise<MeshTenant[]> {
    return await stats.recordQuery(
      this.platform,
      async () => await this.meshAdapter.getMeshTenants(stats),
    );
  }
}
