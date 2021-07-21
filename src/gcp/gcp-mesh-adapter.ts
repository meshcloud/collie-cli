import { log } from "../deps.ts";
import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import {
  MeshPlatform,
  MeshTag,
  MeshTenant,
} from "../mesh/mesh-tenant.model.ts";
import { GcpCliFacade } from "./gcp-cli-facade.ts";
import { isProject } from "./gcp.model.ts";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "../mesh/mesh-iam-model.ts";
import { MeshError } from "../errors.ts";

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
        roleAssignments: [],
      };
    });
  }

  attachTenantCosts(
    _tenants: MeshTenant[],
    _startDate: Date,
    _endDate: Date,
  ): Promise<void> {
    log.warning(
      `This CLI does not support GCP cost collection at the moment. We will implement this at a later stage when GCP supports billing exports via CLI.`,
    );

    return Promise.resolve();
  }

  async attachTenantRoleAssignments(tenants: MeshTenant[]): Promise<void> {
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
