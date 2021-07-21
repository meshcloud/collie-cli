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
    this.duration[source] = end - start;

    return result;
  }
}

export interface MeshAdapter {
  getMeshTenants(stats: QueryStatistics): Promise<MeshTenant[]>;

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
