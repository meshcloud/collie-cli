import { MeshTenant } from "../MeshTenantModel.ts";
import { MeshTenantFilter } from "./MeshTenantFilter.ts";

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
