import { Account } from "/api/aws/Model.ts";
import { Subscription } from "/api/az/Model.ts";
import { Project } from "/api/gcloud/Model.ts";
import { MeshTenantRoleAssignment } from "./MeshIamModel.ts";

export interface MeshTag {
  tagName: string;
  tagValues: string[];
}

export interface MeshTenant {
  platformTenantId: string;
  platformTenantName: string;
  platformType: MeshPlatform;
  platformId: string;
  ancestors: MeshTenantAncestor[];
  tags: MeshTag[];
  nativeObj: Account | Subscription | Project;
  costs: MeshTenantCost[];
  roleAssignments: MeshTenantRoleAssignment[];
}

export interface MeshTenantAncestor {
  type: string;
  id: string;
  name: string;
}

export interface MeshTenantCostDetails {
  name: string;
  from: string;
  to: string;
  usageCost: string;
}

export type IsoDate = string;

export interface MeshTenantCost {
  cost: string;
  from: IsoDate;
  to: IsoDate;
  currency: string;
  details: MeshTenantCostDetails[];
}

export enum MeshPlatform {
  AWS = "AWS",
  Azure = "Azure",
  GCP = "GCP",
}

export const MeshPlatforms = Object.values(MeshPlatform);
