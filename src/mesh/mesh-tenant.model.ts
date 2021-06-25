import { Account } from "../aws/aws.model.ts";
import { Subscription } from "../azure/azure.model.ts";
import { Project } from "../gcp/gcp.model.ts";

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
}

export interface MeshTenantCostDetails {
  name: string;
  from: string;
  to: string;
  usageCost: string;
  currency: string;
}

/**
 * TODO Should it handle usage costs for multiple currencies at once?
 *
 */
export interface MeshTenantCost {
  totalUsageCost: string;
  from: string;
  to: string;
  details: MeshTenantCostDetails[];
}

export enum MeshPlatform {
  AWS = "AWS",
  Azure = "Azure",
  GCP = "GCP",
}
