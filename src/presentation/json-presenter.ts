import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
} from "../mesh/mesh-tenant.model.ts";
import { Presenter } from "./presenter.ts";
import { MeshPrincipalType, MeshRoleAssignmentSource } from '../mesh/mesh-iam-model.ts';

export interface JsonMeshTenantView {
  platformTenantId: string;
  platformTenantName: string;
  platform: MeshPlatform;
  tags: MeshTag[];
}

export interface JsonMeshTenantCostView {
  relatedTenant: JsonMeshTenantView;
  totalUsageCost: string;
  currency: string;
  from: string;
  to: string;
}

export interface JsonMeshTenantIamView {
  relatedTenant: JsonMeshTenantView;
  principalId: string;
  principalName: string;
  principalType: MeshPrincipalType;
  roleId: string;
  roleName: string;
  assignmentSource: MeshRoleAssignmentSource;
  assignmentId: string;
}

export class JsonPresenter<T> implements Presenter {
  constructor(
    private readonly view: T,
  ) {}

  present(): void {
    const output = JSON.stringify(this.view);
    console.log(output);
  }

  static meshTenantToJsonView(meshTenant: MeshTenant): JsonMeshTenantView {
    return {
      platformTenantId: meshTenant.platformTenantId,
      platformTenantName: meshTenant.platformTenantName,
      platform: meshTenant.platform,
      tags: meshTenant.tags,
    };
  }

  static meshTenantToCostJsonViews(
    meshTenant: MeshTenant,
  ): JsonMeshTenantCostView[] {
    return meshTenant.costs.map((c) => {
      return {
        relatedTenant: JsonPresenter.meshTenantToJsonView(meshTenant),
        totalUsageCost: c.totalUsageCost,
        currency: c.currency,
        from: c.from,
        to: c.to,
      };
    });
  }

  static meshTenantToIamJsonViews(
    meshTenant: MeshTenant
  ): JsonMeshTenantIamView[] {
    return meshTenant.roleAssignments.map((r) => {
      return {
        relatedTenant: JsonPresenter.meshTenantToJsonView(meshTenant),
        principalId: r.principalId,
        principalName: r.principalName,
        principalType: r.principalType,
        roleId: r.roleId,
        roleName: r.roleName,
        assignmentId: r.assignmentId,
        assignmentSource: r.assignmentSource
      }
    });
  }
}
