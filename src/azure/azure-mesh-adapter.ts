import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
  MeshTenantCost,
} from "../mesh/mesh-tenant.model.ts";
import { isSubscription, Tag } from "./azure.model.ts";
import { AzureCliFacade } from "./azure-cli-facade.ts";
import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import { moment } from "../deps.ts";
import { CLICommand, CLIName, loadConfig } from "../config/config.model.ts";
import {
  AzureErrorCode,
  MeshAzurePlatformError,
  MeshError,
} from "../errors.ts";
import {
  TimeWindow,
  TimeWindowCalculator,
} from "../mesh/time-window-calculator.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "../mesh/mesh-iam-model.ts";
import { MeshTenantChangeDetector } from "../mesh/mesh-tenant-change-detector.ts";

export class AzureMeshAdapter implements MeshAdapter {
  constructor(
    private readonly azureCli: AzureCliFacade,
    private readonly timeWindowCalculator: TimeWindowCalculator,
    private readonly tenantChangeDetector: MeshTenantChangeDetector,
  ) {}

  async attachTenantCosts(
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
      console.log(
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

    const summedCosts = new Map<string, number>();
    const currencySymbols = new Map<string, string>();
    for (const ci of costInformations) {
      if (!currencySymbols.has(ci.subscriptionId)) {
        currencySymbols.set(ci.subscriptionId, ci.currency);
      } else {
        // Make sure we only collect the same currency for one tenant.
        // Multiple currency for the same tenant are currently not supported.
        if (currencySymbols.get(ci.subscriptionId) !== ci.currency) {
          throw new MeshAzurePlatformError(
            AzureErrorCode.AZURE_CLI_GENERAL,
            "Encountered two different currencies within one Subscription during cost collection. This is currently not supported.",
          );
        }
      }

      let currentCost = summedCosts.get(ci.subscriptionId) || 0;
      currentCost += ci.amount;
      summedCosts.set(ci.subscriptionId, currentCost);
    }

    for (const t of azureTenants) {
      const summedCost = summedCosts.get(t.platformTenantId) || 0;
      const currencySymbol = currencySymbols.get(t.platformTenantId) || "";

      t.costs.push({
        currency: currencySymbol,
        cost: summedCost.toString(),
        from: startDate,
        to: endDate,
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
        console.debug(
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
            e.errorCode === AzureErrorCode.AZURE_INVALID_SUBSCRIPTION
          ) {
            console.error(
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
      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_TENANT_IS_NOT_SUBSCRIPTION,
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

    console.debug(`Fetched ${tenantCostInfo.length} cost infos from Azure`);

    const totalUsagePretaxCost = [
      0.0,
      ...tenantCostInfo.map((tci) => parseFloat(tci.pretaxCost)),
    ].reduce((acc, val) => acc + val);

    let currencySymbol = "";
    if (tenantCostInfo.length > 0) {
      currencySymbol = tenantCostInfo[0].currency;
      for (const tci of tenantCostInfo) {
        if (tci.currency !== currencySymbol) {
          throw new MeshAzurePlatformError(
            AzureErrorCode.AZURE_CLI_GENERAL,
            `Encountered two different currency during cost collection for tenant ${tenant.platformTenantId}. This is currently not supported.`,
          );
        }
      }
    }

    return {
      currency: currencySymbol,
      cost: totalUsagePretaxCost.toFixed(2),
      details: [], // Can hold daily usages
      from: timeWindow.from,
      to: timeWindow.to,
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
          roleAssignments: [],
        };
      }),
    );
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    // Only work on Azure tenants
    const azureTenants = tenants.filter((t) => isSubscription(t.nativeObj));

    for (const t of azureTenants) {
      const roleAssignments = await this.loadRoleAssignmentsForTenant(t);
      t.roleAssignments.push(...roleAssignments);
    }
  }

  private async loadRoleAssignmentsForTenant(
    tenant: MeshTenant,
  ): Promise<MeshTenantRoleAssignment[]> {
    if (!isSubscription(tenant.nativeObj)) {
      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_TENANT_IS_NOT_SUBSCRIPTION,
        "Given tenant did not contain an Azure Subscription native object",
      );
    }

    const roleAssignments = await this.azureCli.getRoleAssignments(
      tenant.nativeObj,
    );

    return roleAssignments.map((x) => {
      const { assignmentSource, assignmentId } = this.getAssignmentFromScope(
        x.scope,
      );

      return {
        principalId: x.principalId,
        principalName: x.principalName,
        principalType: this.toMeshPrincipalType(x.principalType),
        roleId: x.roleDefinitionId,
        roleName: x.roleDefinitionName,
        assignmentSource,
        assignmentId,
      };
    });
  }

  private toMeshPrincipalType(principalType: string): MeshPrincipalType {
    switch (principalType) {
      case "User":
        return MeshPrincipalType.User;
      case "Group":
        return MeshPrincipalType.Group;
      case "ServicePrincipal":
        return MeshPrincipalType.TechnicalUser;
      default:
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_UNKNOWN_PRINCIPAL_TYPE,
          "Found unknown principalType for Azure: " + principalType,
        );
    }
  }

  private convertTags(tags: Tag[]): MeshTag[] {
    return tags.map<MeshTag>((t) => {
      const tagValues = t.values.map((tv) => tv.tagValue);

      return { tagName: t.tagName, tagValues };
    });
  }

  private getAssignmentFromScope(
    scope: string,
  ): { assignmentId: string; assignmentSource: MeshRoleAssignmentSource } {
    const map: { [key in MeshRoleAssignmentSource]: RegExp } = {
      Organization: /^\/$/, // This means string should equal exactly to "/".
      Ancestor: /\/managementGroups\//,
      Tenant: /\/subscriptions\//,
    };
    for (const key in map) {
      // Looping through an enum-key map sucks a bit: https://github.com/microsoft/TypeScript/issues/33123
      if (map[key as MeshRoleAssignmentSource].test(scope)) {
        return {
          assignmentId: scope.split(map[key as MeshRoleAssignmentSource])[1],
          assignmentSource: key as MeshRoleAssignmentSource,
        };
      }
    }
    throw new MeshAzurePlatformError(
      AzureErrorCode.AZURE_UNKNOWN_PRINCIPAL_ASSIGNMENT_SOURCE,
      "Could not detect assignment source from scope: " + scope,
    );
  }

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    if (!isSubscription(updatedTenant.nativeObj)) {
      return Promise.resolve();
    }

    const changedTags = this.tenantChangeDetector.getChangedTags(
      updatedTenant.tags,
      originalTenant.tags,
    );

    await this.azureCli.putTags(
      updatedTenant.nativeObj,
      changedTags.map((x) => ({ tagName: x.tagName, values: x.tagValues })),
    );
  }
}
