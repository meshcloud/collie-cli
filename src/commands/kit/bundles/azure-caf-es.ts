import { KitBundle, KitMetadata, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {
  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    return new Map<string, KitRepresentation>([
      ["bootstrap", new KitRepresentation(
        "https://github.com/meshcloud/landing-zone-construction-kit/archive/5ce27391f94ab2c9b6b93cfb554c43ba0628b97d.tar.gz",
        "/kit/azure/bootstrap-es",
        [],
        undefined,
        0)
      ],
      ["base", new KitRepresentation(
        "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz",
         undefined,
         [],
         new KitMetadata("Azure CAF Enterprise Scale", "todo description goes here"),
         undefined)
        ]
    ]);
  }
}