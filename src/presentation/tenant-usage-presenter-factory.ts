import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { CliTableTenantUsagePresenter } from "./table-tenant-usage-presenter.ts";
import { CsvTenantUsagePresenter } from "./csv-tenant-usage-presenter.ts";
import { Presenter } from "./presenter.ts";
import { OutputFormat } from "./output-format.ts";
import { YamlPresenter } from "./yaml-presenter.ts";
import { JsonMeshTenantCostView, JsonPresenter } from "./json-presenter.ts";

export class TenantUsagePresenterFactory {
  buildPresenter(
    format: OutputFormat,
    meshTenants: MeshTenant[],
  ): Presenter {
    if (format === OutputFormat.CSV) {
      return this.buildCsvPresenter(meshTenants);
    } else if (format === OutputFormat.TABLE) {
      return this.buildTablePresenter(meshTenants);
    } else if (format === OutputFormat.JSON) {
      return this.builJsonPresenter(meshTenants);
    } else if (format === OutputFormat.YAML) {
      return this.buildYamlPresenter(meshTenants);
    } else {
      throw new MeshError("Unknown output format specified: " + format);
    }
  }

  private buildTablePresenter(meshTenant: MeshTenant[]): Presenter {
    return new CliTableTenantUsagePresenter(meshTenant);
  }

  private buildCsvPresenter(
    meshTenants: MeshTenant[],
  ): Presenter {
    return new CsvTenantUsagePresenter([
      "platform",
      "platformTenantName",
      "platformTenantId",
    ], meshTenants);
  }

  private builJsonPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenanToCostJsonViews,
    );

    return new JsonPresenter<JsonMeshTenantCostView[]>(jsonMeshTenantView);
  }

  private buildYamlPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenanToCostJsonViews,
    );

    return new YamlPresenter<JsonMeshTenantCostView[]>(jsonMeshTenantView);
  }
}
