import { MeshTenant, MeshTenantDiff } from "./mesh-tenant.model.ts";

export interface MeshAdapter {
  getMeshTenants(): Promise<MeshTenant[]>;

  /**
   * This is a high level function that will try as best (feature set depends on the platform implementation)
   * to sync the data contained in the given MeshTenant objects into their cloud representation.
   * As of now, only writing, updating & removing tags is supported.
   *
   * It will return an overview of what was changed.
   *
   * @param updatedTenants The tenants with the updated data.
   * @param originalTenants The tenants how they originally looked like. This is used to build a diff between
   *                        the old state and the desired new state.
   */
  updateMeshTenants(
    updatedTenants: MeshTenant[],
    originalTenants: MeshTenant[],
  ): Promise<MeshTenantDiff[]>;

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
