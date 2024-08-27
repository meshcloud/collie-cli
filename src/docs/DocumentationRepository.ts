import * as path from "std/path";
import { FoundationRepository } from "../model/FoundationRepository.ts";
import { convertToPosixPath } from "../path.ts";

export class DocumentationRepository {
  // DESIGN:
  // we use a "hidden" directory with a leading "." because terragrunt excludes hidden files and dirs
  // when building a terragrunt-cache folder, see  https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#terraform "include_in_copy"
  // >  By default, Terragrunt excludes hidden files and folders during the copy step.
  private readonly docsRootDir = ".docs-v2";
  private readonly docsContentDir = "docs";

  constructor(private readonly foundation: FoundationRepository) {}

  resolvePath(...pathSegments: string[]) {
    return this.foundation.resolvePath(this.docsRootDir, ...pathSegments);
  }

  private makeLink(from: string, to: string) {
    // note: in generated markdown we only use POSIX style paths
    const relativeLink = path.relative(from, to);

    return convertToPosixPath(relativeLink);
  }

  kitModuleLink(from: string, moduleId: string) {
    const kitModulePath = this.resolveKitModulePath(moduleId);

    return this.makeLink(from, kitModulePath);
  }

  resolveKitModulePath(moduleId: string) {
    return this.resolvePath(this.docsContentDir, "kit", moduleId + ".md");
  }

  controlLink(from: string, controlId: string) {
    const controlPath = this.resolveControlPath(controlId);

    return this.makeLink(from, controlPath);
  }

  resolveCompliancePath(...pathSegments: string[]) {
    return this.resolvePath(this.docsContentDir, "compliance", ...pathSegments);
  }

  resolveControlPath(controlId: string) {
    return this.resolveCompliancePath(controlId + ".md");
  }

  resolvePlatformsPath(...pathSegments: string[]) {
    return this.resolvePath(this.docsContentDir, "platforms", ...pathSegments);
  }

  resolvePlatformModulePath(platformId: string, kitModuleId: string) {
    // this might be a bit too naive
    const flattenedId = kitModuleId.replaceAll("/", "-");

    return this.resolvePlatformsPath(platformId, flattenedId + ".md");
  }
}
