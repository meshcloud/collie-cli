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
import { CLICommand, CLIName, loadConfig } from "../config/config.model.ts";
import { MeshAzurePlatformError, MeshError } from "../errors.ts";
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

    if (moment(endDate).isBefore(moment(startDate))) {
      throw new MeshError("endDate must be after startDate");
    }

    const config = loadConfig();
    if (config.azure.parentManagementGroups.length == 0) {
      log.info(
        "It seems you have not configured a Azure Management Group for Subscription lookup. " +
          `Because of a bug in the Azure API, ${CLIName} can not detect this automatically. By ` +
          "configuring an Azure management group, cost & usage information lookups are significantly faster. " +
          `Run '${CLICommand} config azure -h' for more information.`,
      );
      await this.getTenantCostsWithSingleQueries(
        azureTenants,
        startDate,
        endDate,
      );
    } else {
      await this.getTenantCostsWithManagementGroupQuery(
        config.azure.parentManagementGroups,
        azureTenants,
        startDate,
        endDate,
      );
    }
  }

  private async getTenantCostsWithManagementGroupQuery(
    managementGroupIds: string[],
    azureTenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Only work on Azure tenants
    const from = moment(startDate).format("YYYY-MM-DDT00:00:00");
    const to = moment(endDate).format("YYYY-MM-DDT23:59:59");

    const costInformations = [];
    for (const mgmntGroupId of managementGroupIds) {
      const costInformation = await this.azureCli.getCostManagementInfo(
        mgmntGroupId,
        from,
        to,
      );
      costInformations.push(...costInformation);
    }

    let currencySymbol: string | null = null;
    const summedCosts = new Map<string, number>();
    for (const ci of costInformations) {
      // TODO manage the currency symbol.
      if (currencySymbol === null || currencySymbol === ci.currency) {
        currencySymbol = ci.currency;
      } else {
        throw new MeshAzurePlatformError(
          "AZURE_CLI_GENERAL",
          "Encoutered two different currency during cost collection. This is currently not supported.",
        );
      }
      let currentCost = summedCosts.get(ci.subscriptionId) || 0;
      currentCost += ci.amount;
      summedCosts.set(ci.subscriptionId, currentCost);
    }

    for (const t of azureTenants) {
      t.costs.push({
        currency: currencySymbol || "Unknown", // should usually be set by now.
        totalUsageCost: (summedCosts.get(t.platformTenantId) || 0).toString(),
        from: startDate.toUTCString(),
        to: endDate.toUTCString(),
        details: [],
      });
    }
  }

  private async getTenantCostsWithSingleQueries(
    azureTenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const timeWindows = this.timeWindowCalculator.calculateTimeWindows(
      startDate,
      endDate,
    );

    for (const t of azureTenants) {
      const results = [];
      for (const tw of timeWindows) {
        log.debug(
          `Quering Azure for tenant ${t.platformTenantName}: ${
            JSON.stringify(tw)
          }`,
        );

        try {
          const result = await this.getTenantCostsForWindow(t, tw);
          results.push(result);
        } catch (e) {
          if (
            e instanceof MeshAzurePlatformError &&
            e.errorCode === "AZURE_INVALID_SUBSCRIPTION"
          ) {
            log.warning(
              `The Subscription ${t.platformTenantId} can not be cost collected as Azure only supports Enterprise Agreement, Web Direct and Customer Agreements offer type Subscriptions to get cost collected via API.`,
            );
          }
        }
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
    const tenantCostInfo = await this.azureCli.getConsumptionInformation(
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
      currency: "",
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
