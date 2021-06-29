import { MeshAdapter } from "./mesh-adapter.ts";
import { MeshTenant } from "./mesh-tenant.model.ts";

export class MultiMeshAdapter implements MeshAdapter {
  constructor(
    private readonly adapters: MeshAdapter[],
  ) {}

  async getMeshTenants(): Promise<MeshTenant[]> {
    const promises = this.adapters.map((x) => x.getMeshTenants());

    return (await Promise.all(promises)).flatMap((x) => x);
  }

  async loadTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.loadTenantCosts(tenants, startDate, endDate)
    );

    // we wait until all functions have resolved then we can return.
    await Promise.all(promises);
  }

  async loadTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    const promises = this.adapters.map((x) =>
      x.loadTenantRoleAssignments(tenants)
    );

    await Promise.all(promises);
  }
}
