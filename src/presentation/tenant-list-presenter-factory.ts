import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { CsvTenantListPresenter } from "./csv-tenant-list-presenter.ts";
import { JsonMeshTenantView, JsonPresenter } from "./json-presenter.ts";
import { MeshTableFactory } from "./mesh-table-factory.ts";
import { MeshTenantTableViewGenerator } from "./meshtenant-table-view-generator.ts";
import { OutputFormat } from "./output-format.ts";
import { Presenter } from "./presenter.ts";
import { TablePresenter } from "./table-presenter.ts";
import { YamlPresenter } from "./yaml-presenter.ts";

export class TenantListPresenterFactory {
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

  private buildTablePresenter(meshTenants: MeshTenant[]): Presenter {
    const tableViewGenerator = new MeshTenantTableViewGenerator(
      meshTenants,
      [
        "platform",
        "platformTenantName",
        "platformTenantId",
        "tags",
      ],
    );

    return new TablePresenter(
      tableViewGenerator,
      this.tableFactory.buildMeshTable(),
    );
  }

  private buildCsvPresenter(meshTenants: MeshTenant[]): Presenter {
    return new CsvTenantListPresenter([
      "platform",
      "platformTenantName",
      "platformTenantId",
    ], meshTenants);
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
