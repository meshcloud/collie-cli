import { dim, yellow } from "../deps.ts";

import { Table } from "../deps.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { MeshTableTag, TableOutput } from "./tabel-view.model.ts";

export class MeshTenantTableView extends TableOutput {
  public info = "";

  constructor(
    readonly meshTenants: MeshTenant[],
    readonly columns: (keyof MeshTenant)[],
  ) {
    super(columns);
    this.info = `GCP: ${
      meshTenants.filter((mt) => mt.platform === "GCP").length
    }, AWS: ${
      meshTenants.filter((mt) => mt.platform === "AWS").length
    }, Azure: ${meshTenants.filter((mt) => mt.platform === "Azure").length}`;
  }

  public generateRows(): string[][] {
    var rows: Array<string>[] = [];
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
}
