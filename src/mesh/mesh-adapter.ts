import { MeshTenant, MeshTenantDiff } from "./mesh-tenant.model.ts";

export interface MeshAdapter {
  getMeshTenants(): Promise<MeshTenant[]>;

  /**
   * This is a high level function that will try as best (feature set depends on the platform implementation)
   * to sync the data contained in the given MeshTenant objects into their cloud representation. E.g. the tags.
   *
   * It will return an overfiew of what was changed.
   *
   * @param meshTenants
   */
  updateMeshTenants(meshTenants: MeshTenant[]): Promise<MeshTenantDiff[]>;

  /**
   * Fetches the costs in the given interval and attaches it to the given MeshTenant objects.
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

  /**
   * Fetches IAM roles of the given tenants and attaches it to the given MeshTenant objects.
   * @param tenants Tenants to which the the IAM roles are fetched and updated.
   * @param stats
   */
  attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void>;
}
