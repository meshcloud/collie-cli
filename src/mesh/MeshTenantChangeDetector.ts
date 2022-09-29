import { MeshTag } from "./MeshTenantModel.ts";

/**
 * This is a class that is useful for detecting differences between a meshTenant, e.g. you can identify which MeshTags
 * have changed compared to an old and new tenant.
 */
export class MeshTenantChangeDetector {
  getChangedTags(updatedTags: MeshTag[], originalTags: MeshTag[]) {
    return updatedTags.filter(
      (ut) =>
        !originalTags.some(
          (ot) =>
            ut.tagName === ot.tagName &&
            scalarArrayEquals(ut.tagValues, ot.tagValues),
        ),
    );
  }
}

function scalarArrayEquals(x: string[], y: string[]) {
  return x.length === y.length && x.every((value, index) => value === y[index]);
}
