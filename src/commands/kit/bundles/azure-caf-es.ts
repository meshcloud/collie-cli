import { KitBundle, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {
  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    return new Map<string, KitRepresentation>([
      ["bootstrap", new KitRepresentation("https://github.com/", [])],
      ["base", new KitRepresentation("https://github.com/", [])]
    ]);
  }
}