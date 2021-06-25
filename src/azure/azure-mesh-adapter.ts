import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
  MeshTenantCost,
} from "../mesh/mesh-tenant.model.ts";
import { isSubscription, Tag } from "./azure.model.ts";
import { AzureCliFacade } from "./azure-cli-facade.ts";
import { Big, log } from "../deps.ts";
import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import { MeshError } from "../errors.ts";
import {
  TimeWindow,
  TimeWindowCalculator,
} from "../mesh/time-window-calculator.ts";

export class AzureMeshAdapter implements MeshAdapter {
  constructor(
    private readonly azureCli: AzureCliFacade,
    private readonly timeWindowCalculator: TimeWindowCalculator,
  ) {}

  async loadTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Only work on Azure tenants
    const azureTenants = tenants.filter((t) => isSubscription(t.nativeObj));

    for (const t of azureTenants) {
      const costs = await this.getTenantCosts(t, startDate, endDate);
      t.costs.push(...costs);
    }
  }

  private async getTenantCosts(
    tenant: MeshTenant,
    startDate: Date,
    endDate: Date,
  ): Promise<MeshTenantCost[]> {
    if (endDate < startDate) {
      throw new MeshError("endDate must be after startDate");
    }

    const timeWindows = this.timeWindowCalculator.calculateTimeWindows(
      startDate,
      endDate,
    );

    const results = [];
    for (const tw of timeWindows) {
      log.debug(
        `Quering Azure for tenant ${tenant.platformTenantName}: ${
          JSON.stringify(tw)
        }`,
      );
      const result = await this.getTenantCostsForWindow(tenant, tw);
      results.push(result);
    }

    return results;
  }

  private async getTenantCostsForWindow(
    tenant: MeshTenant,
    timeWindow: TimeWindow,
  ): Promise<MeshTenantCost> {
    if (!isSubscription(tenant.nativeObj)) {
      throw new MeshError(
        "Given tenant did not contain an Azure Subscription native object",
      );
    }

    // This can throw an error because of too many requests. We should catch this and
    // wait here.
    const tenantCostInfo = await this.azureCli.getCostInformation(
      tenant.nativeObj,
      timeWindow.from,
      timeWindow.to,
    );

    log.debug(`Fetched ${tenantCostInfo.length} cost infos from Azure`);

    const totalUsagePretaxCost = [
      new Big(0.0),
      ...tenantCostInfo.map((tci) => new Big(tci.pretaxCost)),
    ].reduce((acc, val) => acc.plus(val));

    return {
      totalUsageCost: totalUsagePretaxCost.toFixed(2),
      details: [], // Can hold daily usages
      from: timeWindow.from.toUTCString(),
      to: timeWindow.to.toUTCString(),
    };
  }

  async getMeshTenants(): Promise<MeshTenant[]> {
    const subscriptions = await this.azureCli.listAccounts();

    return Promise.all(
      subscriptions.map(async (sub) => {
        const tags = await this.azureCli.listTags(sub);
        const meshTags = this.convertTags(tags);

        return {
          platformTenantId: sub.id,
          tags: meshTags,
          platformTenantName: sub.name,
          platform: MeshPlatform.Azure,
          nativeObj: sub,
          costs: [],
        };
      }),
    );
  }

  private convertTags(tags: Tag[]): MeshTag[] {
    return tags.map<MeshTag>((t) => {
      const tagValues = t.values.map((tv) => tv.tagValue);

      return { tagName: t.tagName, tagValues };
    });
  }
}
