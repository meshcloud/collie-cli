import { MeshTenant } from "./mesh-tenant.model.ts";

export interface MeshAdapter {
  getMeshTenants(): Promise<MeshTenant[]>;

  /**
   * It fetches the costs in the given interval and attaches it to the given MeshTenant objects.
   *
   * @param tenants Tenants to which the the costs are fetched and updated.
   * @param startDate
   * @param endDate
   */
  attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void>;

  attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void>;
}
