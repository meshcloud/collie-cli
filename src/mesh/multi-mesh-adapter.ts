import { MeshAdapter } from "./mesh-adapter.ts";
import { MeshTenant } from "./mesh-tenant.model.ts";

export class MultiMeshAdapter extends MeshAdapter {
  constructor(
    private readonly adapters: MeshAdapter[],
  ) {
    super();
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    const promises = this.adapters.map((x) => x.getMeshTenants());

    const all = await Promise.all(promises);

    return all.flatMap((x) => x);
  }

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.updateMeshTenant(updatedTenant, originalTenant)
    );

    await Promise.all(promises);
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.attachTenantCosts(tenants, startDate, endDate)
    );

    // we wait until all functions have resolved then we can return.
    await Promise.all(promises);
  }

  async attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.attachTenantRoleAssignments(tenants)
    );

    await Promise.all(promises);
  }
}
