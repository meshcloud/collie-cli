import { pooledMap } from "std/async";
import { MeshAdapter } from "/mesh/MeshAdapter.ts";
import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
  MeshTenantCost,
} from "/mesh/MeshTenantModel.ts";
import { GcloudCliFacade } from "./GcloudCliFacade.ts";
import { isProject, Labels } from "./Model.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "/mesh/MeshIamModel.ts";
import { MeshError } from "/errors.ts";
import { TimeWindowCalculator } from "/mesh/TimeWindowCalculator.ts";
import { moment } from "/deps.ts";
import { MeshTenantChangeDetector } from "/mesh/MeshTenantChangeDetector.ts";

// limit concurrency because we will run into azure rate limites for sure if we set this off all at once
const concurrencyLimit = 8;

export class GcloudMeshAdapter implements MeshAdapter {
  constructor(
    private readonly gcpCli: GcloudCliFacade,
    private readonly timeWindowCalculator: TimeWindowCalculator,
    private readonly tenantChangeDetector: MeshTenantChangeDetector,
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
        roleAssignments: [],
      };
    });
  }

  async updateMeshTenant(
    updatedTenant: MeshTenant,
    originalTenant: MeshTenant,
  ): Promise<void> {
    if (!isProject(updatedTenant.nativeObj)) {
      return Promise.resolve();
    }

    const changedTags = this.tenantChangeDetector.getChangedTags(
      updatedTenant.tags,
      originalTenant.tags,
    );

    const labels: Labels = {};
    changedTags.forEach((x) => {
      labels[x.tagName] = x.tagValues[0];
    });

    await this.gcpCli.updateTags(updatedTenant.nativeObj, labels);
  }

  async attachTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const gcpTenants = tenants.filter((t) => isProject(t.nativeObj));
    const gcpCosts = await this.gcpCli.listCosts(startDate, endDate);

    for (const tenant of gcpTenants) {
      const timeWindows = this.timeWindowCalculator.calculateTimeWindows(
        startDate,
        endDate,
      );
      for (const window of timeWindows) {
        // Get a date string exactly like the invoice_month is structured in GCP, e.g. September 2021 => 202109
        const invoiceMonthString = moment(window.from).format("YYYYMM");
        const tenantCostItem: MeshTenantCost = {
          currency: "",
          from: window.from,
          to: window.to,
          cost: "0",
          details: [],
        };
        const gcpCostItem = gcpCosts.find(
          (c) =>
            c.project_id === tenant.platformTenantId &&
            c.invoice_month === invoiceMonthString,
        );
        if (gcpCostItem) {
          tenantCostItem.cost = gcpCostItem.cost;
          tenantCostItem.currency = gcpCostItem.currency;
        }
        tenant.costs.push(tenantCostItem);
      }
    }
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
    const gcpTenants = tenants.filter((t) => isProject(t.nativeObj));

    const tasks = pooledMap(concurrencyLimit, gcpTenants, async (tenant) => ({
      tenant,
      roleAssignments: await this.getRoleAssignmentsForTenant(tenant),
    }));

    for await (const t of tasks) {
      t.tenant.roleAssignments.push(...t.roleAssignments);
    }
  }

  private async getRoleAssignmentsForTenant(
    tenant: MeshTenant,
  ): Promise<MeshTenantRoleAssignment[]> {
    if (!isProject(tenant.nativeObj)) {
      throw new MeshError(
        "Given tenant did not contain a GCP Project native object",
      );
    }

    const result: MeshTenantRoleAssignment[] = [];

    const iamPolicies = await this.gcpCli.listIamPolicy(tenant.nativeObj);
    for (const policy of iamPolicies) {
      const assignmentSource = this.toAssignmentSource(policy.type);
      const assignmentId = policy.id;

      // bindings can be empty
      if (!policy.policy.bindings) {
        continue;
      }

      for (const binding of policy.policy.bindings) {
        for (const member of binding.members) {
          // The member string is given as e.g. -> group:demo-project-user@dev.example.com
          const [principalType, principalName] = member.split(":");
          result.push({
            // We supply the same value for ID & Name as we do not have more information than this.
            principalId: principalName,
            principalName,
            principalType: this.toPrincipalType(principalType),
            // We supply the same value for ID & Name as we do not have more information than this.
            roleId: binding.role,
            roleName: binding.role,
            assignmentSource,
            assignmentId,
          });
        }
      }
    }

    return result;
  }

  private toPrincipalType(principalType: string): MeshPrincipalType {
    switch (principalType) {
      case "user":
        return MeshPrincipalType.User;
      case "group":
        return MeshPrincipalType.Group;
      case "serviceAccount":
        return MeshPrincipalType.TechnicalUser;
      case "domain":
        return MeshPrincipalType.Domain;
      case "deleted":
        return MeshPrincipalType.Orphan;
      default:
        throw new MeshError(
          "Found unknown principalType for GCP: " + principalType,
        );
    }
  }

  private toAssignmentSource(type: string): MeshRoleAssignmentSource {
    switch (type) {
      case "organization":
        return MeshRoleAssignmentSource.Organization;
      case "folder":
        return MeshRoleAssignmentSource.Ancestor;
      case "project":
        return MeshRoleAssignmentSource.Tenant;
      default:
        throw new MeshError("Found unknown assignment source type: " + type);
    }
  }
}
