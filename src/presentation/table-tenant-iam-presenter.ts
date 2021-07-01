import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { Presenter } from "./presenter.ts";
import { MeshTenantIamTableView } from './meshtenant-iam-table-view.ts';

export class TableTenantIamPresenter implements Presenter {
  constructor(
    private readonly meshTenants: MeshTenant[],
  ) {
  }

  present(): void {
    new MeshTenantIamTableView(this.meshTenants, [
      "platform",
      "platformTenantName",
      "platformTenantId",
      "roleAssignments",
    ]).draw();
  }
}
