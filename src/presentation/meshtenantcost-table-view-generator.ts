import { MeshTenant, MeshTenantCost } from "../mesh/mesh-tenant.model.ts";
import { TableGenerator } from "./mesh-table.ts";

type CostTableColums = keyof MeshTenantCost | "relatedTenant";

export class MeshTenantCostTableViewGenerator implements TableGenerator {
  constructor(
    private readonly meshTenants: MeshTenant[],
    private readonly columns: CostTableColums[],
  ) {
  }

  getColumns(): string[] {
    return this.columns;
  }

  getRows(): string[][] {
    const rows: Array<string>[] = [];

    this.meshTenants.forEach((mt) => {
      mt.costs.forEach((mc) => {
        const row: string[] = [];
        this.columns.forEach((column: string, index: number) => {
          // Typing here is suboptimal as this is a key now not present anymore in the MeshTenantCosts.
          // However it will work as we redirect here to the tenant itself.
          if (column === "relatedTenant") {
            row[index] = `(${mt.platform}) ${mt.platformTenantName}`;
          } else {
            const x = column as keyof MeshTenantCost;
            row[index] = mc[x].toString();
          }
        });

        if (row.length > 0) {
          rows.push(row);
        }
      });
    });

    return rows;
  }

  getInfo(): string {
    return "";
  }
}
