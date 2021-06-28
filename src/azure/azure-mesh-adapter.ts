import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
  MeshTenantCost,
} from "../mesh/mesh-tenant.model.ts";
import { isSubscription, Tag } from "./azure.model.ts";
import { AzureCliFacade } from "./azure-cli-facade.ts";
import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import { log, moment } from "../deps.ts";
import { loadConfig } from "../config/config.model.ts";
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
    const config = loadConfig();
    if (config.azure.parentManagementGroups.length == 0) {
      log.warning(
        "Please configure an Azure management group ID under which your Subscriptions are placed. " +
          "Because of a bug in the Azure API collie can not detect this automatically and with this info cost usage lookups are significantly faster.",
      );
      await this.getTenantCostsWithSingleQueries(tenants, startDate, endDate);
    } else {
      await this.getTenantCostsWithManagementGroupQuery(
        config.azure.parentManagementGroups,
        tenants,
        startDate,
        endDate,
      );
    }
  }

  private async getTenantCostsWithManagementGroupQuery(
    managementGroupIds: string[],
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Only work on Azure tenants
    const azureTenants = tenants.filter((t) => isSubscription(t.nativeObj));
    const from = moment(startDate).format("YYYY-MM-DDT00:00:00");
    const to = moment(endDate).format("YYYY-MM-DDT23:59:59");

    const costInformations = [];
    for (const mgmntGroupId of managementGroupIds) {
      const costInformation = await this.azureCli.getCostInfo(
        mgmntGroupId,
        from,
        to,
      );
      costInformations.push(...costInformation);
    }

    const summedCosts = new Map<string, number>();
    for (const ci of costInformations) {
      // TODO manage the currency symbol.
      let currentCost = summedCosts.get(ci.subscriptionId) || 0;
      currentCost += ci.amount;
      summedCosts.set(ci.subscriptionId, currentCost);
    }

    for (const t of azureTenants) {
      t.costs.push({
        totalUsageCost: (summedCosts.get(t.platformTenantId) || 0).toString(),
        from: startDate.toUTCString(),
        to: endDate.toUTCString(),
        details: [],
      });
    }
  }

  private async getTenantCostsWithSingleQueries(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    if (endDate < startDate) {
      throw new MeshError("endDate must be after startDate");
    }

    const timeWindows = this.timeWindowCalculator.calculateTimeWindows(
      startDate,
      endDate,
    );

    // Only work on Azure tenants
    const azureTenants = tenants.filter((t) => isSubscription(t.nativeObj));

    for (const t of azureTenants) {
      const results = [];
      for (const tw of timeWindows) {
        log.debug(
          `Quering Azure for tenant ${t.platformTenantName}: ${
            JSON.stringify(tw)
          }`,
        );
        const result = await this.getTenantCostsForWindow(t, tw);
        results.push(result);
      }

      t.costs.push(...results);
    }
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
      0.0,
      ...tenantCostInfo.map((tci) => parseFloat(tci.pretaxCost)),
    ].reduce((acc, val) => acc + val);

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
