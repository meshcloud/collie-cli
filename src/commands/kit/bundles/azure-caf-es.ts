import { KitBundle, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {
  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    return new Map<string, KitRepresentation>([
      ["bootstrap", new KitRepresentation("", [])],
      ["base", new KitRepresentation("https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz", [])]
    ]);
  }
}