import { AzCliFacade } from "./AzCliFacade.ts";
import { AzMeshAdapter } from "./AzMeshAdapter.ts";
import { RoleAssignment, Subscription } from "./Model.ts";
import { MeshPlatform, MeshTenant } from "/mesh/MeshTenantModel.ts";
import { assertEquals } from "std/assert";
import {
  MeshPrincipalType,
  MeshRoleAssignmentSource,
  MeshTenantRoleAssignment,
} from "/mesh/MeshIamModel.ts";
import { MeshTenantChangeDetector } from "/mesh/MeshTenantChangeDetector.ts";

const cli = {
  getRoleAssignments(): Promise<RoleAssignment[]> {
    return Promise.resolve([
      {
        principalId: "dev_ops_team",
        principalName: "DevOps Team",
        principalType: "Group",
        roleDefinitionId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/234",
        roleDefinitionName: "Owner",
        scope: "/subscriptions/my_subscription_id",
      },
      {
        principalId: "john_doe",
        principalName: "johndoe@example.com",
        principalType: "User",
        roleDefinitionId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/456",
        roleDefinitionName: "User Access Administrator",
        scope: "/",
      },
      {
        principalId: "api_automation",
        principalName: "API Automation",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/345",
        roleDefinitionName: "Blueprint Contributor",
        scope:
          "/providers/Microsoft.Management/managementGroups/api_automations_group",
      },
    ]);
  },
} as unknown as AzCliFacade;

const sut = new AzMeshAdapter(cli, {} as MeshTenantChangeDetector);

Deno.test(
  "when inputting a response with all types of assignment sources, they are properly converted from the 'scope' properties",
  async () => {
    const tenants: MeshTenant[] = [
      {
        platformTenantName: "",
        platformTenantId: "",
        tags: [],
        roleAssignments: [],
        costs: [],
        platform: MeshPlatform.Azure,
        nativeObj: {
          tenantId: "",
          id: "",
        } as Subscription,
      },
    ];
    await sut.attachTenantRoleAssignments(tenants);
    const expected: MeshTenantRoleAssignment[] = [
      {
        principalId: "dev_ops_team",
        principalName: "DevOps Team",
        principalType: MeshPrincipalType.Group,
        roleId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/234",
        roleName: "Owner",
        assignmentId: "my_subscription_id",
        assignmentSource: MeshRoleAssignmentSource.Tenant,
      },
      {
        principalId: "john_doe",
        principalName: "johndoe@example.com",
        principalType: MeshPrincipalType.User,
        roleId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/456",
        roleName: "User Access Administrator",
        assignmentId: "",
        assignmentSource: MeshRoleAssignmentSource.Organization,
      },
      {
        principalId: "api_automation",
        principalName: "API Automation",
        principalType: MeshPrincipalType.TechnicalUser,
        roleId:
          "/subscriptions/123/providers/Microsoft.Authorization/roleDefinitions/345",
        roleName: "Blueprint Contributor",
        assignmentId: "api_automations_group",
        assignmentSource: MeshRoleAssignmentSource.Ancestor,
      },
    ];
    assertEquals(tenants[0].roleAssignments, expected);
  },
);
