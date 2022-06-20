import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/MeshTenantModel.ts";
import { QueryStatistics } from "../mesh/QueryStatistics.ts";
import { CsvTenantListPresenter } from "./csv-tenant-list-presenter.ts";
import { JsonMeshTenantView, JsonPresenter } from "./json-presenter.ts";
import { MeshTableFactory } from "./mesh-table-factory.ts";
import { MeshTenantTableViewGenerator } from "./meshtenant-table-view-generator.ts";
import { OutputFormat } from "./output-format.ts";
import { Presenter } from "./presenter.ts";
import { TablePresenter } from "./table-presenter.ts";
import { YamlPresenter } from "./yaml-presenter.ts";

export class TenantListPresenterFactory {
  constructor(private readonly tableFactory: MeshTableFactory) {}

  buildPresenter(
    format: OutputFormat,
    meshTenants: MeshTenant[],
    stats: QueryStatistics,
  ): Presenter {
    switch (format) {
      case OutputFormat.CSV:
        return this.buildCsvPresenter(meshTenants);
      case OutputFormat.TABLE:
        return this.buildTablePresenter(meshTenants, stats);
      case OutputFormat.JSON:
        return this.builJsonPresenter(meshTenants);
      case OutputFormat.YAML:
        return this.buildYamlPresenter(meshTenants);
      default:
        throw new MeshError("Unknown output format specified: " + format);
    }
  }

  private buildTablePresenter(
    meshTenants: MeshTenant[],
    stats: QueryStatistics,
  ): Presenter {
    const tableViewGenerator = new MeshTenantTableViewGenerator(meshTenants, [
      "platformId",
      "platformTenantName",
      "platformTenantId",
      "tags",
    ]);

    return new TablePresenter(
      tableViewGenerator,
      this.tableFactory.buildMeshTable(),
      stats,
    );
  }

  private buildCsvPresenter(meshTenants: MeshTenant[]): Presenter {
    return new CsvTenantListPresenter(
      ["platformId", "platformTenantName", "platformTenantId"],
      meshTenants,
    );
  }

  private builJsonPresenter(meshTenants: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenants.map(
      JsonPresenter.meshTenantToJsonView,
    );

    return new JsonPresenter<JsonMeshTenantView[]>(jsonMeshTenantView);
  }

  private buildYamlPresenter(meshTenants: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenants.map(
      JsonPresenter.meshTenantToJsonView,
    );

    return new YamlPresenter<JsonMeshTenantView[]>(jsonMeshTenantView);
  }
}
