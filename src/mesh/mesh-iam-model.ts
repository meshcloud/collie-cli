export interface MeshTenantRoleAssignment {
  principalId: string;
  principalName: string;
  principalType: MeshPrincipalType;
  roleId: string;
  roleName: string;
  // What is it coming from? Organization  / Ancestor (Folder/MG) / Tenant
  assignmentSource: MeshRoleAssignmentSource;
  assignmentId: string; // GCP folder ID, Azure MG ID,
}

export enum MeshRoleAssignmentSource {
  Organization = "Organization",
  Ancestor = "Ancestor",
  Tenant = "Tenant"
}

export enum MeshPrincipalType {
  User = "User",
  Group = "Group",
  TechnicalUser = "TechnicalUser",
}
