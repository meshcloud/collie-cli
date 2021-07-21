import { MeshAdapter, QueryStatistics } from "./mesh-adapter.ts";
import { MeshPlatform, MeshTenant } from "./mesh-tenant.model.ts";

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
  ): Promise<void> {
    await this.meshAdapter.attachTenantCosts(tenants, startDate, endDate);
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    await this.meshAdapter.attachTenantRoleAssignments(tenants);
  }

  async getMeshTenants(stats: QueryStatistics): Promise<MeshTenant[]> {
    return await stats.recordQuery(
      this.platform,
      async () => await this.meshAdapter.getMeshTenants(stats),
    );
  }
}
