import * as path from "std/path";
import { FoundationRepository } from "../model/FoundationRepository.ts";

export class DocumentationRepository {
  // we use a "hidden" directory with a leading "." because terragrunt excludes hidden files and dirs
  // when building a terragrunt-cache folder, see  https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#terraform "include_in_copy"
  // >  By default, Terragrunt excludes hidden files and folders during the copy step.
  public readonly docsRootDir = ".docs";
  public readonly docsContentDir = "docs";

  // these paths are the same in collie repository and docs content
  public readonly platformsDir = "platforms";
  public readonly complianceDir = "compliance";
  public readonly kitDir = "kit";

  public readonly docsContentPath: string;
  public readonly kitPath: string;
  public readonly compliancePath: string;
  public readonly platformsPath: string;

  constructor(foundation: FoundationRepository) {
    this.docsContentPath = foundation.resolvePath(
      this.docsRootDir,
      this.docsContentDir,
    );

    this.kitPath = path.join(this.docsContentPath, this.kitDir);
    this.compliancePath = path.join(this.docsContentPath, this.complianceDir);
    this.platformsPath = path.join(this.docsContentPath, this.platformsDir);
  }

  kitModuleLink(from: string, moduleId: string) {
    const kitModulePath = this.kitModulePath(moduleId);

    return path.relative(from, kitModulePath);
  }

  kitModulePath(moduleId: string) {
    return path.join(this.kitPath, moduleId + ".md");
  }

  controlLink(from: string, controlId: string) {
    const controlPath = this.controlPath(controlId);

    return path.relative(from, controlPath);
  }

  controlPath(controlId: string) {
    return path.join(this.compliancePath, controlId + ".md");
  }

  platformPath(platformId: string) {
    return path.join(this.platformsPath, platformId + ".md");
  }
}
