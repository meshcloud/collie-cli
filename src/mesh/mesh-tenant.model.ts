import { Account } from "../aws/aws.model.ts";
import { Subscription } from "../azure/azure.model.ts";
import { Project } from "../gcp/gcp.model.ts";
import { MeshTenantRoleAssignment } from "./mesh-iam-model.ts";

export interface MeshTag {
  tagName: string;
  tagValues: string[];
}

export interface MeshTenant {
  platformTenantId: string;
  platformTenantName: string;
  platform: MeshPlatform;
  tags: MeshTag[];
  nativeObj: Account | Subscription | Project;
  costs: MeshTenantCost[];
  roleAssignments: MeshTenantRoleAssignment[];
}

export interface MeshTenantCostDetails {
  name: string;
  from: string;
  to: string;
  usageCost: string;
}

export interface MeshTenantCost {
  totalUsageCost: string;
  from: string;
  to: string;
  currency: string;
  details: MeshTenantCostDetails[];
}

export enum MeshPlatform {
  AWS = "AWS",
  Azure = "Azure",
  GCP = "GCP",
}
