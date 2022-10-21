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

  abstract kitsAndSources(): Map<string, KitRepresentation>;
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