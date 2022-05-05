import { MeshTenant, MeshTenantCost } from "../mesh/MeshTenantModel.ts";
import { TableGenerator } from "./mesh-table.ts";
import { moment } from "../deps.ts";

type CostTableColumns = keyof MeshTenantCost | "relatedTenant" | "tags";

export class MeshTenantCostTableViewGenerator extends TableGenerator {
  constructor(
    private readonly meshTenants: MeshTenant[],
    private readonly columns: CostTableColumns[],
  ) {
    super();
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
          } else if (column === "tags") {
            row[index] = this.formatMeshTags(mt.tags);
          } else {
            const x = column as keyof MeshTenantCost;
            if (mc[x] instanceof Date) {
              row[index] = moment(mc[x]).format("YYYY-MM-DD");
            } else {
              row[index] = mc[x].toString();
            }
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
