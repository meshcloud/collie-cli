import { MeshTenantFilter } from "./mest-tenant-filter.ts";
import { PrincipalNameMeshTenantFilter } from "./principal-name-mesh-tenant-filter.ts";

export class MeshTenantFilterFactory {
  buildFilterFromString(filterStr: string): MeshTenantFilter {
    // currently we only support a very simple, plain filter for principalName.

    return new PrincipalNameMeshTenantFilter(filterStr);
  }
}
