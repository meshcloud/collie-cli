import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
  MeshTenantCost,
} from "../mesh/mesh-tenant.model.ts";
import { GcpCliFacade } from "./gcp-cli-facade.ts";
import { isProject } from "./gcp.model.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "../mesh/mesh-iam-model.ts";
import { MeshError } from "../errors.ts";
import { TimeWindowCalculator } from "../mesh/time-window-calculator.ts";
import { moment } from "../deps.ts";

export class GcpMeshAdapter implements MeshAdapter {
  constructor(
    private readonly gcpCli: GcpCliFacade,
    private readonly timeWindowCalculator: TimeWindowCalculator,
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
        const gcpCostItem = gcpCosts.find((c) =>
          c.project_id === tenant.platformTenantId &&
          c.invoice_month === invoiceMonthString
        );
        if (gcpCostItem) {
          tenantCostItem.cost = gcpCostItem.cost;
          tenantCostItem.currency = gcpCostItem.currency;
        }
        tenant.costs.push(tenantCostItem);
      }
    }
  }

  async attachTenantRoleAssignments(
    tenants: MeshTenant[],
  ): Promise<void> {
    const gcpTenants = tenants.filter((t) => isProject(t.nativeObj));

    for (const tenant of gcpTenants) {
      const roleAssignments = await this.getRoleAssignmentsForTenant(tenant);
      tenant.roleAssignments.push(...roleAssignments);
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
        throw new MeshError(
          "Found unknown assignment source type: " + type,
        );
    }
  }
}
