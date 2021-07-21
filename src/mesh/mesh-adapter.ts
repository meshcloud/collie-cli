import { MeshPlatform, MeshTenant } from "./mesh-tenant.model.ts";

export enum QuerySource {
  Cloud,
  Cache,
}

export class QueryStatistics {
  source: QuerySource = QuerySource.Cloud;

  readonly duration: {
    [P in MeshPlatform | "cache"]?: number;
  } = {};

  async recordQuery<T>(
    source: MeshPlatform | "cache",
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now(); // note: ms precision is enough for collie, we don't require --allow-hrtime for more precision

    const result = await fn();

    const end = performance.now();
    const passed = end - start;
    this.duration[source] = (this.duration[source] || 0) + passed;

    return result;
  }
}

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
