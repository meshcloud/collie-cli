import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { MeshTenantTableView } from "./meshtenant-table-view.ts";
import { Presenter } from "./presenter.ts";

export class TableTenantListPresenter implements Presenter {
  constructor(
    private readonly meshTenants: MeshTenant[],
  ) {
  }

  present(): void {
    new MeshTenantTableView(this.meshTenants, [
      "platform",
      "platformTenantName",
      "platformTenantId",
      "tags",
    ]).draw();
  }
}
