import { Account } from "/api/aws/Model.ts";
import { Subscription } from "/api/az/azure.model.ts";
import { Project } from "/api/gcloud/gcp.model.ts";
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
  cost: string;
  from: Date;
  to: Date;
  currency: string;
  details: MeshTenantCostDetails[];
}

export enum MeshPlatform {
  AWS = "AWS",
  Azure = "Azure",
  GCP = "GCP",
}

export const MeshPlatforms = Object.values(MeshPlatform);
