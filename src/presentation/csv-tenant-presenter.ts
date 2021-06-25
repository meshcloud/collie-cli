import { MeshTag, MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { Presenter } from "./presenter.ts";

export type PrintedTenantKey = keyof MeshTenant;

export abstract class CsvTenantPresenter implements Presenter {
  abstract present(): void;

  protected combineExistingTagNames(tags: MeshTag[]): string[] {
    // Extract all the tag names into a set.
    const existingTagNames = new Set<string>();

    tags.map((t) => t.tagName)
      .forEach((tn) => existingTagNames.add(tn));

    const result: string[] = [];
    existingTagNames.forEach((tn) => result.push(tn));

    return result;
  }

  protected extractTagValues(
    existingTagNames: string[],
    currentTags: MeshTag[],
  ): string[] {
    const tagValues: string[] = [];

    existingTagNames.forEach((tn) => {
      const ct = currentTags.find((ct) => ct.tagName === tn);
      if (ct) {
        const curTagValues = ct.tagValues.join(", ");
        tagValues.push(curTagValues);
      } else {
        tagValues.push("");
      }
    });

    return tagValues;
  }
}
