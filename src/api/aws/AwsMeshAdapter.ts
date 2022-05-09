import { pooledMap } from "std/async";

import { MeshAdapter } from "/mesh/MeshAdapter.ts";
import { AwsCliFacade } from "./AwsCliFacade.ts";
import {
  MeshPlatform,
  MeshTenant,
  MeshTenantCost,
} from "/mesh/MeshTenantModel.ts";
import { Account, Credentials, isAccount, User } from "./Model.ts";
import { moment } from "/deps.ts";
import { AwsErrorCode, MeshAwsPlatformError, MeshError } from "/errors.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
} from "/mesh/MeshIamModel.ts";
import { MeshTenantChangeDetector } from "/mesh/MeshTenantChangeDetector.ts";

// limit concurrency because we will run into aws rate limites for sure if we set this off all at once
const concurrencyLimit = 5;

export class AwsMeshAdapter implements MeshAdapter {
  /**
   * @param awsCli
   * @param roleNameToAssume For certain API calls we need to assume a role in an account. This is the role name. Usually is 'OrganizationAccountAccessRole'
   * @param tenantChangeDetector
   */
  constructor(
    private readonly awsCli: AwsCliFacade,
    private readonly roleNameToAssume: string,
    private readonly tenantChangeDetector: MeshTenantChangeDetector,
  ) {}

  async getMeshTenants(): Promise<MeshTenant[]> {
    const accounts = await this.awsCli.listAccounts();

    const getTagsIterator = pooledMap(
      concurrencyLimit,
      accounts,
      async (account) => {
        const tags = await this.awsCli.listTags(account);

        const meshTags = tags.map((t) => {
          return { tagName: t.Key, tagValues: [t.Value] };
        });

        return {
          platformTenantId: account.Id,
          platformTenantName: account.Name,
          platform: MeshPlatform.AWS,
          nativeObj: account,
          tags: meshTags,
          costs: [],
          roleAssignments: [],
        };
      },
    );

    const tenants = [];

    for await (const t of getTagsIterator) {
      tenants.push(t);
    }

    return tenants;
  }

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    if (!isAccount(updatedTenant.nativeObj)) {
      return Promise.resolve();
    }

    const changedTags = this.tenantChangeDetector.getChangedTags(
      updatedTenant.tags,
      originalTenant.tags,
    );

    await this.awsCli.addTags(
      updatedTenant.nativeObj,
      changedTags.map((x) => ({ Key: x.tagName, Value: x.tagValues[0] })),
    );
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const awsTenants = tenants.filter((t) => isAccount(t.nativeObj));
    // As with AWS each query costs $0.01, we query as much as possible in one go to minimize cost.
    const costInfo = await this.awsCli.listCosts(startDate, endDate);

    for (const tenant of awsTenants) {
      // Its already filtered inside awsTenants so we dont need to re-filter here.
      const account = tenant.nativeObj as Account;

      // Note: normally we use [TimeWindowCalculator] for handling time windows, but we assume here that AWS returns the
      // right time periods for slicing the data on a per-month basis.
      for (const result of costInfo.ResultsByTime) {
        const from = moment.utc(result.TimePeriod.Start); // Comes in the format of '2021-01-01'.
        let to = moment(from).endOf("month");
        if (to.isAfter(endDate)) {
          // If [endDate] is in the middle of the month, we need to prevent 'to' from referring to the end.
          to = moment(endDate);
        }

        const costItem: MeshTenantCost = {
          currency: "",
          from: from.toDate(),
          to: to.toDate(),
          cost: "0",
          details: [],
        };

        const costForTenant = result.Groups.find(
          (g) => g.Keys[0] === account.Id,
        );
        if (costForTenant) {
          const blendedCost = costForTenant.Metrics["BlendedCost"];
          costItem.cost = blendedCost.Amount;
          costItem.currency = blendedCost.Unit;
        }

        tenant.costs.push(costItem);
      }
    }

    return Promise.resolve();
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    const awsTenants = tenants.filter((t) => isAccount(t.nativeObj));

    for (const tenant of awsTenants) {
      isAccount(tenant.nativeObj);
      const account = tenant.nativeObj;
      if (!isAccount(account)) {
        throw new MeshError("A non AWS account was encountered");
      }

      // Detect if the user gave us a role arn or only a role name. If its only a role name
      // we assume the role lives in his current caller account and try to assume it with this
      // arn.
      const assumeRoleArn =
        `arn:aws:iam::${account.Id}:role/${this.roleNameToAssume}`;
      // Assume the role to execute the following commands from the account context.
      // This can fail if the role to assume does not exist in the target account.

      const assumedCredentials = await this.tryAssumeRole(assumeRoleArn);
      if (assumedCredentials == null) {
        continue;
      }

      const tenantUsers = await this.awsCli.listUsers(assumedCredentials);

      // Fetch the user attached policies first.
      for (const tenantUser of tenantUsers) {
        const attachedUserPolicies = await this.awsCli.listAttachedUserPolicies(
          tenantUser,
          assumedCredentials,
        );

        // We now combine these users with the policies.
        const roleAssignments = attachedUserPolicies.flatMap((p) => {
          return {
            principalId: tenantUser.Arn,
            principalName: tenantUser.UserName,
            principalType: MeshPrincipalType.User,
            roleId: p.PolicyArn,
            roleName: p.PolicyName,
            assignmentSource: MeshRoleAssignmentSource.Tenant,
            assignmentId: "", // There is no assignment representation in AWS. Users are directly placed in a group.
          };
        });

        tenant.roleAssignments.push(...roleAssignments);
      }

      const groups = await this.awsCli.listGroups(assumedCredentials);
      const userIdsWithGroup: string[] = [];

      // Fetch the group attached policies and correlate them with the user.
      for (const group of groups) {
        const usersOfGroup = await this.awsCli.listUserOfGroup(
          group,
          assumedCredentials,
        );

        // Save the ids so we can find users without a group later
        userIdsWithGroup.push(...usersOfGroup.map((x) => x.UserId));

        // Find the inline and attached policies of a group.
        const attachedGroupPolicies = await this.awsCli
          .listAttachedGroupPolicies(
            group,
            assumedCredentials,
          );

        // We now combine these users with the policies.
        const roleAssignments = attachedGroupPolicies.flatMap((p) => {
          return usersOfGroup.map((u) => {
            return {
              principalId: group.Arn,
              principalName: u.UserName,
              principalType: MeshPrincipalType.Group,
              roleId: p.PolicyArn,
              roleName: p.PolicyName,
              assignmentSource: MeshRoleAssignmentSource.Tenant,
              assignmentId: "", // There is no assignment representation in AWS. Users are directly placed in a group.
            };
          });
        });

        tenant.roleAssignments.push(...roleAssignments);
      }

      this.attachUserWithNoRoleAssignment(
        tenant,
        userIdsWithGroup,
        tenantUsers,
      );
    }

    return Promise.resolve();
  }

  private attachUserWithNoRoleAssignment(
    tenant: MeshTenant,
    userIdsWithGroup: string[],
    tenantUsers: User[],
  ) {
    const usersWithNoGroup = tenantUsers.filter(
      (tu) => userIdsWithGroup.findIndex((gu) => gu === tu.UserId) === -1,
    );

    const userAssignmentsWithoutGroup = usersWithNoGroup.map((u) => {
      return {
        principalId: u.Arn,
        principalName: u.UserName,
        principalType: MeshPrincipalType.User,
        roleId: "",
        roleName: "Without Group",
        assignmentSource: MeshRoleAssignmentSource.Tenant,
        assignmentId: "", // There is no assignment representation in AWS. Users are directly placed in a group.
      };
    });

    tenant.roleAssignments.push(...userAssignmentsWithoutGroup);
  }

  private async tryAssumeRole(
    assumeRoleArn: string,
  ): Promise<Credentials | null> {
    try {
      return await this.awsCli.assumeRole(assumeRoleArn);
    } catch (e) {
      if (
        MeshAwsPlatformError.isInstanceWithErrorCode(
          e,
          AwsErrorCode.AWS_UNAUTHORIZED,
        )
      ) {
        console.error(
          `Could not assume role ${assumeRoleArn}. It probably does not exist in the target account`,
        );

        return Promise.resolve(null);
      }

      throw e;
    }
  }
}
