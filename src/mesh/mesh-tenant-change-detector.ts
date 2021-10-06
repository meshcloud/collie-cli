import { MeshTag } from "./mesh-tenant.model.ts";
import { equal } from "../deps.ts";

/**
 * This is a class that is useful for detecting differences between a meshTenant, e.g. you can identify which MeshTags
 * have changed compared to an old and new tenant.
 */
export class MeshTenantChangeDetector {
  getChangedTags(updatedTags: MeshTag[], originalTags: MeshTag[]) {
    return updatedTags.filter((updatedTag) =>
      !originalTags.some((originalTag) => equal(updatedTag, originalTag))
    );
  }
}
