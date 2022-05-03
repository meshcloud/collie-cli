import { MeshTenant } from "../mesh-tenant.model.ts";
import { MeshTenantFilter } from "./mest-tenant-filter.ts";

export class PrincipalNameMeshTenantFilter implements MeshTenantFilter {
  constructor(
    private readonly principalName: string,
    private readonly includeAncestors: boolean,
  ) {}

  filter(tenant: MeshTenant): boolean {
    const result = !!tenant.roleAssignments.find((x) => {
      if (!this.includeAncestors && x.assignmentSource !== "Tenant") {
        return false;
      }

      return x.principalName === this.principalName;
    });

    return result;
  }
}
