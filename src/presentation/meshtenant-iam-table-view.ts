import { bold, Table } from "../deps.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import {
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "../mesh/mesh-iam-model.ts";
import { TableGenerator } from './mesh-table.ts';

export class MeshTenantIamTableView implements TableGenerator {
  info = "";

  constructor(
    readonly meshTenants: MeshTenant[],
    readonly columns: (keyof MeshTenant)[],
  ) {
  }

  getColumns(): string[] {
    return this.columns;
  }

  getInfo(): string {
    return "";
  }

  getRows(): string[][] {
    var rows: Array<string>[] = [];
    this.meshTenants.forEach((meshTenant: MeshTenant) => {
      var row: string[] = [];
      this.columns.forEach((header: string, index: number) => {
        var tmpRows: Array<string>[] = [];
        if (header === "roleAssignments") {
          // The IAM inner-table should be formatted as such:
          // <role-name>
          //   - <principal-name> (<principal-type>)
          //   - <principal-name> (<principal-type>)
          // <role-name>
          //   - <principal-name> (<principal-type>)
          const groupedRoles: {
            [roleName: string]: MeshTenantRoleAssignment[];
          } = {};
          meshTenant.roleAssignments.forEach((x) => {
            // TODO table view currently does not contain assignment info (what level is this coming from)
            // Might need an additional grouping level
            if (groupedRoles[x.roleName]) {
              groupedRoles[x.roleName].push(x);
            } else {
              groupedRoles[x.roleName] = [x];
            }
          });
          for (let roleName in groupedRoles) {
            let roleAssignments = groupedRoles[roleName];

            tmpRows.push([`${bold(roleName)}`]);
            roleAssignments.forEach((r) =>
              tmpRows.push([` - ${r.principalName} (${r.principalType})`])
            );
          }
          const tmpTable = new Table();
          tmpTable.body(tmpRows).border(false).maxColWidth(90);
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
