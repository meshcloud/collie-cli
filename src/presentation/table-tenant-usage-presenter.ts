import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { MeshTenantCostTableView } from "./meshtenantcost-table-view.ts";
import { Presenter } from "./presenter.ts";

export class CliTableTenantUsagePresenter implements Presenter {
  constructor(
    private readonly meshTenantCost: MeshTenant[],
  ) {}

  present() {
    new MeshTenantCostTableView(this.meshTenantCost, [
      "relatedTenant",
      "totalUsageCost",
      "from",
      "to",
    ]).draw();
  }
}
