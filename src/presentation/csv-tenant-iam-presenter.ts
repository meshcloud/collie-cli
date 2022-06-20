import { writeCSV } from "../deps.ts";
import { MeshTenant } from "../mesh/MeshTenantModel.ts";
import {
  CsvTenantPresenter,
  PrintedTenantKey,
} from "./csv-tenant-presenter.ts";
import { MeshTenantRoleAssignment } from "../mesh/MeshIamModel.ts";

export type PrintedIamKey = keyof MeshTenantRoleAssignment;

export class CsvTenantIamPresenter extends CsvTenantPresenter {
  constructor(
    private readonly printedKeys: PrintedTenantKey[],
    private readonly meshTenant: MeshTenant[],
    private readonly printedIamKeys: PrintedIamKey[],
  ) {
    super();
  }

  async present() {
    const rows: string[][] = [[...this.printedKeys, ...this.printedIamKeys]];

    this.meshTenant.forEach((mt) => {
      mt.roleAssignments.forEach((ra) => {
        rows.push(this.buildRow(mt, ra));
      });
    });

    await writeCSV(Deno.stdout, rows);
  }

  private buildRow(
    tenant: MeshTenant,
    roleAssignment: MeshTenantRoleAssignment,
  ): string[] {
    const row: string[] = [];

    this.printedKeys.forEach((k) => {
      if (
        k !== "tags" &&
        k !== "roleAssignments" &&
        k !== "nativeObj" &&
        k !== "ancestors" &&
        k !== "costs"
      ) {
        row.push(tenant[k]);
      }
    });

    this.printedIamKeys.forEach((k) => {
      row.push(roleAssignment[k]);
    });

    return row;
  }
}
