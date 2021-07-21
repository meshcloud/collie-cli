import { dim, yellow } from "../deps.ts";

import { Table } from "../deps.ts";
import { MeshPlatforms, MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { MeshTableTag, TableGenerator } from "./mesh-table.ts";

export class MeshTenantTableViewGenerator implements TableGenerator {
  constructor(
    readonly meshTenants: MeshTenant[],
    private readonly columns: (keyof MeshTenant)[],
  ) {
  }

  getColumns(): string[] {
    return this.columns;
  }

  getRows(): string[][] {
    const rows: Array<string>[] = [];
    this.meshTenants.forEach((meshTenant: MeshTenant) => {
      var row: string[] = [];
      this.columns.forEach((header: string, index: number) => {
        var tmpRows: Array<string>[] = [];
        if (header === "tags") {
          meshTenant[header].forEach((x) => {
            const t = new MeshTableTag(x);

            tmpRows.push([`${dim(t.tagName)}: `, yellow(t.tagValues[0])]);
            x.tagValues.slice(1).forEach((t) => tmpRows.push(["", yellow(t)]));
          });
          const tmpTable = new Table();
          tmpTable.body(tmpRows).border(false).maxColWidth(45);
          row[index] = tmpTable.toString();
        } else {
          const x = header as keyof typeof meshTenant;
          row[index] = meshTenant[x]
            .toString();
        }
      });
      rows.push(row);
    });
    return rows;
  }

  getInfo(): string {
    const counts = MeshPlatforms.map((mp) => {
      const count = this.meshTenants.filter((mt) => mt.platform === mp).length;
      return `${mp}: ${count}`;
    });

    return counts.join(", ");
  }
}
