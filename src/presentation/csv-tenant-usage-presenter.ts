import { moment } from "x/deno_moment";
import { writeCSV } from "x/csv";
import { MeshTenant, MeshTenantCost } from "../mesh/MeshTenantModel.ts";
import {
  CsvTenantPresenter,
  PrintedTenantKey,
} from "./csv-tenant-presenter.ts";

export class CsvTenantUsagePresenter extends CsvTenantPresenter {
  constructor(
    private readonly printedKeys: PrintedTenantKey[],
    private readonly meshTenant: MeshTenant[],
  ) {
    super();
  }

  async present() {
    const tags = this.meshTenant.flatMap((t) => t.tags);
    const tagNames = this.combineExistingTagNames(tags);

    const rows = [
      [...this.printedKeys, "from", "to", "totalCost", "currency", ...tagNames],
    ];

    this.meshTenant.forEach((mt) => {
      mt.costs.forEach((tc) => {
        rows.push(this.buildRow(tagNames, mt, tc));
      });
    });

    await writeCSV(Deno.stdout, rows);
  }

  private buildRow(
    tagNames: string[],
    tenant: MeshTenant,
    tenantCost: MeshTenantCost,
  ): string[] {
    const row = [];

    this.printedKeys.forEach((k) => {
      row.push(tenant[k]);
    });

    row.push(moment(tenantCost.from).toISOString());
    row.push(moment(tenantCost.to).toISOString());
    row.push(tenantCost.cost);
    row.push(tenantCost.currency);

    // Add the tags here in the right order to the current row.
    const tagValues = this.extractTagValues(tagNames, tenant.tags);
    tagValues.forEach((tv) => row.push(tv));

    return row;
  }
}
