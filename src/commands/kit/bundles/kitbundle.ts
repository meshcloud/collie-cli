export class KitRepresentation {
  sourceUrl: string
  requiredParameters: string[]
  constructor(sourceUrl: string, requiredParameters: string[]) {
    this.sourceUrl = sourceUrl;
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