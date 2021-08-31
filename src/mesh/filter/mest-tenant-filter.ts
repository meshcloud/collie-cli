import { MeshTenant } from "../mesh-tenant.model.ts";

export interface MeshTenantFilter {
  filter(tenant: MeshTenant): boolean;
}