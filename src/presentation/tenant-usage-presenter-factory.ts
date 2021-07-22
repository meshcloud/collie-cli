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
import { QueryStatistics } from "../mesh/query-statistics.ts";

export class TenantUsagePresenterFactory {
  constructor(
    private readonly tableFactory: MeshTableFactory,
  ) {}

  buildPresenter(
    format: OutputFormat,
    meshTenants: MeshTenant[],
    stats: QueryStatistics,
  ): Presenter {
    if (format === OutputFormat.CSV) {
      return this.buildCsvPresenter(meshTenants);
    } else if (format === OutputFormat.TABLE) {
      return this.buildTablePresenter(meshTenants, stats);
    } else if (format === OutputFormat.JSON) {
      return this.buildJsonPresenter(meshTenants);
    } else if (format === OutputFormat.YAML) {
      return this.buildYamlPresenter(meshTenants);
    } else {
      throw new MeshError("Unknown output format specified: " + format);
    }
  }

  private buildTablePresenter(
    meshTenant: MeshTenant[],
    stats: QueryStatistics,
  ): Presenter {
    const costTableViewGenerator = new MeshTenantCostTableViewGenerator(
      meshTenant,
      [
        "relatedTenant",
        "cost",
        "currency",
        "from",
        "to",
      ],
    );

    return new TablePresenter(
      costTableViewGenerator,
      this.tableFactory.buildMeshTable(),
      stats,
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

  private buildJsonPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenantToCostJsonViews,
    );

    return new JsonPresenter<JsonMeshTenantCostView[]>(jsonMeshTenantView);
  }

  private buildYamlPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenantToCostJsonViews,
    );

    return new YamlPresenter<JsonMeshTenantCostView[]>(jsonMeshTenantView);
  }
}
