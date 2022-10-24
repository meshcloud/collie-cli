import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
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

  beforeApply(): void {    
  }

  afterApply(platformPath: string): void {
    // TODO this is not need bc it resulted from a previous bug
    // delete if exists: top level terragrunt file in foundation
    // try {
    //   Deno.removeSync(path.join(platformPath, "terragrunt.hcl"));
    // } catch(e) { console.log(e); /* ignore if file not there */ }
  }

  afterDeploy(platformPath: string): void {
  }  
}