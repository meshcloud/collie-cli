import { TableOutput } from "./tabel-view.model.ts";
import { MeshTenant, MeshTenantCost } from "../mesh/mesh-tenant.model.ts";

type CostTableColums = keyof MeshTenantCost | "relatedTenant";

export class MeshTenantCostTableView extends TableOutput {
  public info = "";

  constructor(
    readonly meshTenants: MeshTenant[],
    readonly columns: CostTableColums[],
  ) {
    super(columns);
  }

  public generateRows(): string[][] {
    var rows: Array<string>[] = [];

    this.meshTenants.forEach((mt) => {
      var row: string[] = [];

      mt.costs.forEach((mc) => {
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
      });

      if (row.length > 0) {
        rows.push(row);
      }
    });

    return rows;
  }
}
