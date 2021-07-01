import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { CsvTenantListPresenter } from "./csv-tenant-list-presenter.ts";
import { JsonMeshTenantView, JsonPresenter } from "./json-presenter.ts";
import { OutputFormat } from "./output-format.ts";
import { Presenter } from "./presenter.ts";
import { TableTenantListPresenter } from "./table-tenant-list-presenter.ts";
import { YamlPresenter } from "./yaml-presenter.ts";
import { TableTenantIamPresenter } from './table-tenant-iam-presenter.ts';

export class TenantIamPresenterFactory {
  buildPresenter(
    format: OutputFormat,
    meshTenants: MeshTenant[],
  ): Presenter {
    if (format === OutputFormat.TABLE) {
      return this.buildTablePresenter(meshTenants);
    } else {
      throw new MeshError("Unknown output format specified: " + format);
    }
  }

  private buildTablePresenter(meshTenants: MeshTenant[]): Presenter {
    return new TableTenantIamPresenter(meshTenants);
  }
}
