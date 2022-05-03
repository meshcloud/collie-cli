import { MeshAdapter } from "./mesh-adapter.ts";
import { MeshTenant } from "./mesh-tenant.model.ts";
import { QueryStatistics } from "./query-statistics.ts";

/**
 * This decorator will record the time it takes for the command to be invoked.
 * Can be helpful in order to figure out if there is a bottleneck in call time.
 */
export class StatsMeshAdapterDecorator implements MeshAdapter {
  constructor(
    private readonly meshAdapter: MeshAdapter,
    private readonly source: string,
    private readonly layer: number,
    private readonly stats: QueryStatistics,
  ) {}

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    return await this.stats.recordQuery(
      this.source,
      this.layer,
      async () =>
        await this.meshAdapter.updateMeshTenant(updatedTenant, originalTenant),
    );
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    return await this.stats.recordQuery(
      this.source,
      this.layer,
      async () =>
        await this.meshAdapter.attachTenantCosts(tenants, startDate, endDate),
    );
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    return await this.stats.recordQuery(
      this.source,
      this.layer,
      async () => await this.meshAdapter.attachTenantRoleAssignments(tenants),
    );
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    return await this.stats.recordQuery(
      this.source,
      this.layer,
      async () => await this.meshAdapter.getMeshTenants(),
    );
  }
}
