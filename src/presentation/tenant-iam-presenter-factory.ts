import { MeshError } from "../errors.ts";
import { MeshTenant } from "../mesh/MeshTenantModel.ts";
import { JsonMeshTenantIamView, JsonPresenter } from "./json-presenter.ts";
import { OutputFormat } from "./output-format.ts";
import { Presenter } from "./presenter.ts";
import { YamlPresenter } from "./yaml-presenter.ts";
import {
  CsvTenantIamPresenter,
  PrintedIamKey,
} from "./csv-tenant-iam-presenter.ts";
import { MeshRoleAssignmentSource } from "../mesh/MeshIamModel.ts";
import { TablePresenter } from "./table-presenter.ts";
import { MeshTableFactory } from "./mesh-table-factory.ts";
import { QueryStatistics } from "../mesh/QueryStatistics.ts";
import { MeshTenantIamTableViewGenerator } from "./meshtenant-iam-table-view-generator.ts";

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
    principalNameHighlight?: string,
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
      return this.buildTablePresenter(
        meshTenants,
        includeAncestors,
        principalNameHighlight,
      );
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

  private buildTablePresenter(
    meshTenants: MeshTenant[],
    includeAncestors: boolean,
    principalNameHighlight?: string,
  ): Presenter {
    const tableViewGenerator = new MeshTenantIamTableViewGenerator(
      meshTenants,
      [
        "platform",
        "platformTenantName",
        "platformTenantId",
        "roleAssignments",
      ],
      includeAncestors,
      principalNameHighlight,
    );

    const stats = new QueryStatistics();

    return new TablePresenter(
      tableViewGenerator,
      this.tableFactory.buildMeshTable(),
      stats,
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
