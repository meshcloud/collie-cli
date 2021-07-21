import { MeshAdapter, QueryStatistics } from "./mesh-adapter.ts";
import { MeshTenant } from "./mesh-tenant.model.ts";

export class MultiMeshAdapter implements MeshAdapter {
  constructor(
    private readonly adapters: MeshAdapter[],
  ) {}

  async getMeshTenants(stats: QueryStatistics): Promise<MeshTenant[]> {
    const promises = this.adapters.map((x) => x.getMeshTenants(stats));

    const all = await Promise.all(promises);

    return all.flatMap((x) => x);
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
    stats: QueryStatistics,
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.attachTenantCosts(tenants, startDate, endDate, stats)
    );

    // we wait until all functions have resolved then we can return.
    await Promise.all(promises);
  }

  async attachTenantRoleAssignments(
    tenants: MeshTenant[],
    stats: QueryStatistics,
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.attachTenantRoleAssignments(tenants, stats)
    );

    await Promise.all(promises);
  }
}
