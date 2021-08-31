import { MeshError } from "../../errors.ts";
import { MeshTenantFilter } from "./mest-tenant-filter.ts";
import { PrincipalNameMeshTenantFilter } from "./principal-name-mesh-tenant-filter.ts";

export class MeshTenantFilterFactory {
  buildFilterFromString(filterStr: string): MeshTenantFilter {
    const filterStrings = filterStr.split("=");

    if (filterStrings.length != 2 || filterStrings[1].length === 0) {
      throw new MeshError(
        "Filter was in the wrong format. Allowed is only the pattern 'principalName=john.doe@example.com'",
      );
    }

    // Currently we only support principalName
    if (filterStrings[0] !== "principalName") {
      throw new MeshError(
        "Only 'principalName' is supported as filter, but was: " +
          filterStrings[0],
      );
    }

    return new PrincipalNameMeshTenantFilter(filterStrings[1]);
  }
}
