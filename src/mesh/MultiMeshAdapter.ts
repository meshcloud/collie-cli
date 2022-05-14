import { MeshError } from "../errors.ts";
import { MeshAdapter } from "./MeshAdapter.ts";
import { MeshTenant } from "./MeshTenantModel.ts";

export class MultiMeshAdapter implements MeshAdapter {
  /**
   * DESIGN: the multi mesh adapter needs to keep track which "source" adapter provided a particular tenant
   * so that it can ask that same adapter for upate/attach operations.
   *
   * This simplifies the adapters (which would have to reject operations for tenants they don't own) and simplifies
   * state management for the caching decorators that go in between
   */

  private readonly tenantMap = new Map<MeshTenant, MeshAdapter>();

  constructor(private readonly adapters: MeshAdapter[]) {}

  async getMeshTenants(): Promise<MeshTenant[]> {
    this.tenantMap.clear();

    const promises = this.adapters.map(async (x) => ({
      adapter: x,
      tenants: await x.getMeshTenants(),
    }));

    const all = await Promise.all(promises);

    all.forEach((x) =>
      x.tenants.forEach((t) => this.tenantMap.set(t, x.adapter))
    );

    return [...this.tenantMap.keys()];
  }

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    const adapter = this.getAdapter(updatedTenant);

    await adapter.updateMeshTenant(updatedTenant, originalTenant);
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const byAdapter = this.groupByAdapter(tenants);

    const promises = [...byAdapter.entries()].map(
      async ([adapter, ts]) =>
        await adapter.attachTenantCosts(ts, startDate, endDate),
    );

    await Promise.all(promises);
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    const byAdapter = this.groupByAdapter(tenants);

    const promises = [...byAdapter.entries()].map(
      async ([adapter, ts]) => await adapter.attachTenantRoleAssignments(ts),
    );

    await Promise.all(promises);
  }

  private getAdapter(updatedTenant: MeshTenant) {
    const adapter = this.tenantMap.get(updatedTenant);

    if (!adapter) {
      throw new MeshError(
        "Adapter responsible for this meshTenant was not recorded in tenantMap, did you forget to call getMeshTenants()? This is a developer error.",
      );
    }

    return adapter;
  }

  private groupByAdapter(tenants: MeshTenant[]) {
    const map = new Map<MeshAdapter, MeshTenant[]>();

    tenants.forEach((x) => {
      const adapter = this.getAdapter(x);
      const entry = map.get(adapter);
      if (!entry) {
        map.set(adapter, [x]);
      } else {
        entry.push(x);
      }
    });

    return map;
  }
}
