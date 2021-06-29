export interface MeshRoleAssignment {
  principalId: string;
  principalName: string;
  principalType: MeshPrincipalType;
  roleId: string;
  roleName: string;
}

export enum MeshPrincipalType {
  User = "User",
  Group = "Group",
  TechnicalUser = "TechnicalUser",
}
