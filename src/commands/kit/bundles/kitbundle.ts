export abstract class KitBundle {
  identifier: string;
  displayName: string;

  constructor(identifier: string, displayName: string) {
    this.identifier = identifier;
    this.displayName = displayName;
  }

  identifiedBy(identifier: string): boolean {
    return this.identifier === identifier;
  }

  // this defines the "contents" of this KitBundle in terms of which kits are contained
  abstract kitsAndSources(): Map<string, KitRepresentation>;

  // callback to by applied before we apply the kits
  abstract beforeApply(parametrization: Map<string,string>): void;

  // callback to by applied after we applied the kits
  abstract afterApply(platformModuleDir: string, parametrization: Map<string,string>): void;

  // callback to by applied after we did the auto-deploy of kits
  abstract afterDeploy(platformModuleDir: string, parametrization: Map<string,string>): void;
}

export class KitRepresentation {
  sourceUrl: string
  sourcePath: string | undefined
  requiredParameters: string[]
  metadataOverride: KitMetadata | undefined
  autoDeployOrder: number | undefined

  /**
   * @param sourceUrl the URL to fetch the kit from
   * @param sourcePath a sub-directory of the given sourceUrl, if only a sub-directory is relevant. Set to `undefined` if the entire directory is relevant.
   */
  constructor(sourceUrl: string, sourcePath: string | undefined, requiredParameters: string[], metadataOverride: KitMetadata | undefined, autoDeploy: number | undefined) {
    this.sourceUrl = sourceUrl;
    this.sourcePath = sourcePath;
    this.requiredParameters = requiredParameters;
    this.metadataOverride = metadataOverride;
    this.autoDeployOrder = autoDeploy;
  }
}

export const metadataKitFileName = "README.md";

export class KitMetadata {
  name: string
  description: string
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
}