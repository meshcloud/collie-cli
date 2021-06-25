import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
} from "../mesh/mesh-tenant.model.ts";
import { Presenter } from "./presenter.ts";

export interface JsonMeshTenantView {
  platformTenantId: string;
  platformTenantName: string;
  platform: MeshPlatform;
  tags: MeshTag[];
}

export interface JsonMeshTenantCostView {
  relatedTenant: JsonMeshTenantView;
  totalUsageCost: string;
  from: string;
  to: string;
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

  static meshTenanToCostJsonViews(
    meshTenant: MeshTenant,
  ): JsonMeshTenantCostView[] {
    return meshTenant.costs.map((c) => {
      return {
        relatedTenant: JsonPresenter.meshTenantToJsonView(meshTenant),
        totalUsageCost: c.totalUsageCost,
        from: c.from,
        to: c.to,
      };
    });
  }
}
