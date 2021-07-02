import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { CsvTenantUsagePresenter } from "./csv-tenant-usage-presenter.ts";
import { Presenter } from "./presenter.ts";
import { OutputFormat } from "./output-format.ts";
import { YamlPresenter } from "./yaml-presenter.ts";
import { JsonMeshTenantCostView, JsonPresenter } from "./json-presenter.ts";
import { MeshTenantCostTableViewGenerator } from "./meshtenantcost-table-view-generator.ts";
import { TablePresenter } from "./table-presenter.ts";
import { MeshTableFactory } from "./mesh-table-factory.ts";

export class TenantUsagePresenterFactory {
  constructor(
    private readonly tableFactory: MeshTableFactory,
  ) {}

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
    const costTableViewGenerator = new MeshTenantCostTableViewGenerator(
      meshTenant,
      [
        "relatedTenant",
        "totalUsageCost",
        "currency",
        "from",
        "to",
      ],
    );

    return new TablePresenter(
      costTableViewGenerator,
      this.tableFactory.buildMeshTable(),
    );
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
