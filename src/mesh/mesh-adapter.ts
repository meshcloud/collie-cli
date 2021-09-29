import { MeshTag, MeshTenant } from "./mesh-tenant.model.ts";
import { equal } from "../deps.ts";

export abstract class MeshAdapter {
  abstract getMeshTenants(): Promise<MeshTenant[]>;

  /**
   * This is a high level function that will try as best (feature set depends on the platform implementation)
   * to sync the data contained in the given MeshTenant object into their cloud representation.
   * As of now, only writing, updating & removing tags is supported.
   *
   * @param updatedTenant The tenant with the updated data.
   * @param originalTenant The tenant how it originally looked like. This is used to build a diff between
   *                        the old state and the desired new state.
   */
  abstract updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void>;

  /**
   * Fetches the costs in the given interval and attaches it to the given MeshTenant objects.
   *
   * @param tenants Tenants to which the the costs are fetched and updated.
   * @param startDate
   * @param endDate
   */
  abstract attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void>;

  /**
   * Fetches IAM roles of the given tenants and attaches it to the given MeshTenant objects.
   * @param tenants Tenants to which the the IAM roles are fetched and updated.
   * @param stats
   */
  abstract attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void>;

  protected getChangedTags(updatedTags: MeshTag[], originalTags: MeshTag[]) {
    return updatedTags.filter((updatedTag) =>
      !originalTags.some((originalTag) => equal(updatedTag, originalTag))
    );
  }
}
