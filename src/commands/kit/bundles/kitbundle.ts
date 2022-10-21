export class KitMetadata {
  name: string
  description: string
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
}

export class KitRepresentation {
  sourceUrl: string
  sourcePath: string | undefined
  requiredParameters: string[]
  metadataOverride: KitMetadata | undefined

  constructor(sourceUrl: string, sourcePath: string | undefined, requiredParameters: string[], metadataOverride: KitMetadata | undefined) {
    this.sourceUrl = sourceUrl;
    this.sourcePath = sourcePath;
    this.requiredParameters = requiredParameters;
    this.metadataOverride = metadataOverride;
  }
}

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