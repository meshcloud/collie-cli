import { log } from "../deps.ts";
import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
} from "../mesh/mesh-tenant.model.ts";
import { GcpCliFacade } from "./gcp-cli-facade.ts";

export class GcpMeshAdapter implements MeshAdapter {
  constructor(
    private readonly gcpCli: GcpCliFacade,
  ) {}

  async getMeshTenants(): Promise<MeshTenant[]> {
    const projects = await this.gcpCli.listProjects();

    return projects.map((x) => {
      let tags: MeshTag[] = [];
      if (x.labels) {
        tags = Object.entries(x.labels).map(([key, value]) => {
          return { tagName: key, tagValues: [value] };
        });
      }

      return {
        platformTenantId: x.projectId,
        platformTenantName: x.name,
        platform: MeshPlatform.GCP,
        nativeObj: x,
        tags: tags,
        costs: [],
      };
    });
  }

  loadTenantCosts(
    _tenants: MeshTenant[],
    _startDate: Date,
    _endDate: Date,
  ): Promise<void> {
    log.warning(
      `This CLI does not support GCP cost collection at the moment. We will implement this at a later stage when GCP supports billing exports via CLI.`,
    );

    return Promise.resolve();
  }
}
