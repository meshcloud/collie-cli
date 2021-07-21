import { MeshTenant } from "./mesh-tenant.model.ts";
import { QueryStatistics } from "./query-statistics.ts";

export interface MeshAdapter {
  getMeshTenants(stats: QueryStatistics): Promise<MeshTenant[]>;

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
    stats: QueryStatistics,
  ): Promise<void>;

  /**
   * Fetches IAM roles of the given tenants and attaches it to the given MeshTenant objects.
   * @param tenants Tenants to which the the IAM roles are fetched and updated.
   * @param stats
   */
  attachTenantRoleAssignments(
    tenants: MeshTenant[],
    stats: QueryStatistics,
  ): Promise<void>;
}
