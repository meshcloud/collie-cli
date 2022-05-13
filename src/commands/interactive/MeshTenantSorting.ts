import { MeshTenant } from "../../mesh/MeshTenantModel.ts";

export class MeshTenantSorting {
  static byCost(a: MeshTenant, b: MeshTenant) {
    let costA = 0;
    let costB = 0;

    if (a) {
      for (const cost of a.costs) {
        if (!!cost.cost && cost.cost != "") {
          costA += Number(cost.cost);
        }
      }
    }
    if (b) {
      for (const cost of b.costs) {
        if (!!cost.cost && cost.cost != "") {
          costB += Number(cost.cost);
        }
      }
    }

    return costB - costA;
  }

  static byName(a: MeshTenant, b: MeshTenant) {
    const tenantNameA = a.platformTenantName.toLocaleUpperCase();
    const tenantNameB = b.platformTenantName.toLocaleUpperCase();
    if (tenantNameA < tenantNameB) {
      return -1;
    } else if (tenantNameB > tenantNameA) {
      return 1;
    } else {
      return 0;
    }
  }
}
