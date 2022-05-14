import { pooledMap } from "std/async";

import { MeshPlatform, MeshTag, MeshTenant } from "/mesh/MeshTenantModel.ts";
import { isSubscription, Tag } from "./Model.ts";
import { AzCliFacade } from "./AzCliFacade.ts";
import { MeshAdapter } from "/mesh/MeshAdapter.ts";
import { moment } from "/deps.ts";
import { AzureErrorCode, MeshAzurePlatformError, MeshError } from "/errors.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "/mesh/MeshIamModel.ts";
import { MeshTenantChangeDetector } from "/mesh/MeshTenantChangeDetector.ts";

// limit concurrency because we will run into azure rate limites for sure if we set this off all at once
const concurrencyLimit = 8;

export class AzMeshAdapter implements MeshAdapter {
  constructor(
    private readonly azureCli: AzCliFacade,
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

    await this.getTenantCosts(azureTenants, startDate, endDate);
  }

  private async getTenantCosts(
    azureTenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Only work on Azure tenants
    const from = startDate.toISOString();
    const to = endDate.toISOString();

    const costInformations = [];

    /**
     * We fetch costs with individual queries per subscription because that has turned out to be the most reliable
     *   - querying by managament group is theoretically faster (less queries) but the Azure API tends to timeout
     *     on large management groups and likes to throw misleading errors (e.g. "Management group xxx does not have
     *     any valid subscriptions.") or simply return no rows
     *   - az costmanagement query does not support pagination and will thus fail for large result sets which are
     *     typical for management group scoped queries, see https://github.com/Azure/azure-cli-extensions/issues/4240
     */

    const scopes = azureTenants.map(
      (x) => `/subscriptions/${x.platformTenantId}`,
    );

    const getCostsIterator = pooledMap(
      concurrencyLimit,
      scopes,
      async (scope) =>
        await this.azureCli.getCostManagementInfo(scope, from, to),
    );

    for await (const c of getCostsIterator) {
      costInformations.push(...c);
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

  async getMeshTenants(): Promise<MeshTenant[]> {
    // todo: should probably use PlatformConfig.azure.aadTenantId instead?
    const account = await this.azureCli.getAccount();
    const subscriptions = await this.azureCli.listSubscriptions();

    const tasks = subscriptions
      .filter((x) => x.tenantId === account.tenantId)
      .map(async (sub) => {
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
      });

    return Promise.all(tasks);
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

  private getAssignmentFromScope(scope: string): {
    assignmentId: string;
    assignmentSource: MeshRoleAssignmentSource;
  } {
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
