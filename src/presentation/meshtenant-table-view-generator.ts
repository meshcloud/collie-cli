import { MeshPlatforms, MeshTenant } from "../mesh/MeshTenantModel.ts";
import { TableGenerator } from "./mesh-table.ts";

export class MeshTenantTableViewGenerator extends TableGenerator {
  constructor(
    readonly meshTenants: MeshTenant[],
    private readonly columns: (keyof MeshTenant)[],
  ) {
    super();
  }

  getColumns(): string[] {
    return this.columns;
  }

  getRows(): string[][] {
    const rows: Array<string>[] = [];
    this.meshTenants.forEach((meshTenant: MeshTenant) => {
      const row: string[] = [];
      this.columns.forEach((header: string, index: number) => {
        if (header === "tags") {
          row[index] = this.formatMeshTags(meshTenant.tags);
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
