import { MeshTenant } from "../mesh-tenant.model.ts";
import { MeshTenantFilter } from "./mest-tenant-filter.ts";

export class PrincipalNameMeshTenantFilter implements MeshTenantFilter {
  constructor(
    private readonly principalName: string,
  ) {}

  filter(tenant: MeshTenant): boolean {
    return !!tenant.roleAssignments.find((x) =>
      x.principalName == this.principalName
    );
  }
}
