import { Logger } from "../cli/Logger.ts";
import { ProgressReporter } from "../cli/ProgressReporter.ts";
import { MeshAdapter } from "./MeshAdapter.ts";
import { MeshTenant } from "./MeshTenantModel.ts";

export class LoggingMeshAdapterDecorator implements MeshAdapter {
  constructor(
    private readonly platformName: string,
    private readonly meshAdapter: MeshAdapter,
    private readonly logger: Logger,
  ) {}

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    await this.meshAdapter.updateMeshTenant(updatedTenant, originalTenant);
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    return await this.reportProgress(
      "fetching tenants",
      async () => await this.meshAdapter.getMeshTenants(),
    );
  }

  public async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    return await this.reportProgress(
      "fetching tenant cost",
      async () =>
        await this.meshAdapter.attachTenantCosts(tenants, startDate, endDate),
    );
  }

  public async attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void> {
    return await this.reportProgress(
      "fetching tenant IAM",
      async () => await this.meshAdapter.attachTenantRoleAssignments(tenants),
    );
  }

  private async reportProgress<T>(verb: string, op: () => Promise<T>) {
    const progress = new ProgressReporter(verb, this.platformName, this.logger);

    try {
      const result = await op();
      return result;
    } finally {
      progress.done();
    }
  }
}
