import { writeCSV } from "x/csv";
import { MeshTenant } from "../mesh/MeshTenantModel.ts";
import {
  CsvTenantPresenter,
  PrintedTenantKey,
} from "./csv-tenant-presenter.ts";

export class CsvTenantListPresenter extends CsvTenantPresenter {
  constructor(
    private readonly printedKeys: PrintedTenantKey[],
    private readonly meshTenants: MeshTenant[],
  ) {
    super();
  }

  async present() {
    const tags = this.meshTenants.flatMap((x) => x.tags);
    const tagNames = this.combineExistingTagNames(tags);
    const rows = [[...this.printedKeys, ...tagNames]];

    this.meshTenants.forEach((mt) => {
      rows.push(this.buildRow(tagNames, mt));
    });

    await writeCSV(Deno.stdout, rows);
  }

  private buildRow(tagNames: string[], tenant: MeshTenant): string[] {
    const row: string[] = [];

    this.printedKeys.forEach((k) => {
      row.push(tenant[k].toString());
    });

    // Add the tags here in the right order to the current row.
    const tagValues = this.extractTagValues(tagNames, tenant.tags);
    tagValues.forEach((tv) => row.push(tv));

    return row;
  }
}
