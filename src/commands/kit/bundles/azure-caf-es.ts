import { KitBundle, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {
  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    return new Map<string, KitRepresentation>([
      ["bootstrap", new KitRepresentation("", [])],
      ["base", new KitRepresentation("https://github.com/Azure/caf-terraform-landingzones/archive/57d67d2640ea8541e639d60fc70de5a3409c8876.tar.gz", [])]
    ]);
  }
}