import * as path from "std/path";

export class DocumentationRepository {
  public readonly kitDir: string;
  public readonly complianceDir: string;
  public readonly platformsDir: string;

  constructor(public readonly contentDir: string) {
    this.kitDir = path.join(this.contentDir, "kit");
    this.complianceDir = path.join(this.contentDir, "compliance");
    this.platformsDir = path.join(this.contentDir, "platforms");
  }

  kitModuleLink(from: string, moduleId: string) {
    const kitModulePath = this.kitModulePath(moduleId);

    return path.relative(from, kitModulePath);
  }

  kitModulePath(moduleId: string) {
    return path.join(this.kitDir, moduleId + ".md");
  }

  controlLink(from: string, controlId: string) {
    const controlPath = this.controlPath(controlId);

    return path.relative(from, controlPath);
  }

  controlPath(controlId: string) {
    return path.join(this.complianceDir, controlId + ".md");
  }

  platformPath(platformId: string) {
    return path.join(this.platformsDir, platformId + ".md");
  }
}
