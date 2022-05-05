import { MeshTenant } from "../MeshTenantModel.ts";

export interface MeshTenantFilter {
  filter(tenant: MeshTenant): boolean;
}
