import * as path from "std/path";
import { FoundationRepository } from "../model/FoundationRepository.ts";

// TODO: refactor this to consistently use resolvePath, have no public members for proper encapsulation
export class DocumentationRepository {
  // we use a "hidden" directory with a leading "." because terragrunt excludes hidden files and dirs
  // when building a terragrunt-cache folder, see  https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#terraform "include_in_copy"
  // >  By default, Terragrunt excludes hidden files and folders during the copy step.
  private readonly docsRootDir = ".docs";
  private readonly docsContentDir = "docs";

  // these paths are the same in collie repository and docs content
  public readonly platformsDir = "platforms";
  public readonly complianceDir = "compliance";
  public readonly kitDir = "kit";

  public readonly docsRootPath: string;
  public readonly docsContentPath: string;
  public readonly kitPath: string;
  public readonly compliancePath: string;
  public readonly platformsPath: string;

  constructor(private readonly foundation: FoundationRepository) {
    this.docsRootPath = foundation.resolvePath(this.docsRootDir);

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
    return this.foundation.resolvePath(
      this.docsRootDir,
      this.docsContentDir,
      this.kitDir,
      moduleId + ".md",
    );
  }

  controlLink(from: string, controlId: string) {
    const controlPath = this.controlPath(controlId);

    return path.relative(from, controlPath);
  }

  controlPath(controlId: string) {
    return this.foundation.resolvePath(
      this.docsRootDir,
      this.docsContentDir,
      this.complianceDir,
      controlId + ".md",
    );
  }

  platformPath(platformId: string) {
    return this.foundation.resolvePath(
      this.docsRootDir,
      this.docsContentDir,
      this.platformsDir,
      platformId + ".md",
    );
  }

  platformModulePath(platformId: string, kitModuleId: string) {
    // this might be a bit too naive
    const flattenedId = kitModuleId.replaceAll("/", "-");

    return this.foundation.resolvePath(
      this.docsRootDir,
      this.docsContentDir,
      this.platformsDir,
      platformId,
      flattenedId + ".md",
    );
  }
}
