import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { JsonMeshTenantIamView, JsonPresenter } from "./json-presenter.ts";
import { OutputFormat } from "./output-format.ts";
import { Presenter } from "./presenter.ts";
import { YamlPresenter } from "./yaml-presenter.ts";
import {
  CsvTenantIamPresenter,
  PrintedIamKey,
} from "./csv-tenant-iam-presenter.ts";
import { MeshRoleAssignmentSource } from "../mesh/mesh-iam-model.ts";
import { TablePresenter } from "./table-presenter.ts";
import { MeshTenantTableViewGenerator } from "./meshtenant-table-view-generator.ts";
import { MeshTableFactory } from "./mesh-table-factory.ts";

// This buildPresenter & individual methods might be a good argument for building a parent abstract class to DRY.
export class TenantIamPresenterFactory {
  constructor(
    private readonly tableFactory: MeshTableFactory,
  ) {
  }

  buildPresenter(
    format: OutputFormat,
    includeAncestors: boolean,
    meshTenants: MeshTenant[],
  ): Presenter {
    // If includeAncestors is not given, we will remove those roleAssignments so they will not be presented to the user.
    if (!includeAncestors) {
      for (const tenant of meshTenants) {
        // We skip assignment that are *not* coming from the tenant level.
        tenant.roleAssignments = tenant.roleAssignments.filter((x) =>
          x.assignmentSource === MeshRoleAssignmentSource.Tenant
        );
      }
    }
    if (format === OutputFormat.TABLE) {
      return this.buildTablePresenter(meshTenants);
    } else if (format === OutputFormat.JSON) {
      return this.buildJsonPresenter(meshTenants);
    } else if (format === OutputFormat.YAML) {
      return this.buildYamlPresenter(meshTenants);
    } else if (format === OutputFormat.CSV) {
      return this.buildCsvPresenter(meshTenants, includeAncestors);
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

  private buildCsvPresenter(
    meshTenants: MeshTenant[],
    includeAncestors: boolean,
  ): Presenter {
    const iamKeys: PrintedIamKey[] = [
      "principalId",
      "principalName",
      "principalType",
      "roleId",
      "roleName",
    ];
    if (includeAncestors) {
      iamKeys.push("assignmentId", "assignmentSource");
    }
    return new CsvTenantIamPresenter(
      [
        "platform",
        "platformTenantName",
        "platformTenantId",
      ],
      meshTenants,
      iamKeys,
    );
  }

  private buildJsonPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenantToIamJsonViews,
    );

    return new JsonPresenter<JsonMeshTenantIamView[]>(jsonMeshTenantView);
  }

  private buildYamlPresenter(meshTenant: MeshTenant[]): Presenter {
    const jsonMeshTenantView = meshTenant.flatMap(
      JsonPresenter.meshTenantToIamJsonViews,
    );

    return new YamlPresenter<JsonMeshTenantIamView[]>(jsonMeshTenantView);
  }
}
