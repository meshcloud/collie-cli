export class KitRepresentation {
  sourceUrl: string
  sourcePath: string | undefined
  requiredParameters: string[]
  constructor(sourceUrl: string, sourcePath: string | undefined, requiredParameters: string[]) {
    this.sourceUrl = sourceUrl;
    this.sourcePath = sourcePath;
    this.requiredParameters = requiredParameters;
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