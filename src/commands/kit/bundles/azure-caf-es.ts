import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { KitBundle, KitDeployRepresentation, KitMetadata, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {

  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    return new Map<string, KitRepresentation>([

      ["bootstrap", new KitRepresentation(
        "https://github.com/meshcloud/landing-zone-construction-kit/archive/5ce27391f94ab2c9b6b93cfb554c43ba0628b97d.tar.gz",
        "/kit/azure/bootstrap-es",
        ["param1", "param2"], //FIxME
        undefined,
        new KitDeployRepresentation(0, true, this.betweenDeployments, { raw: [] }))
      ],
      
      ["base", new KitRepresentation(
        "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz",
         undefined,
         ["param3"],  //FIxME
         new KitMetadata("Azure CAF Enterprise Scale", "todo description goes here"),
         undefined)
      ]

    ]);
  }

  beforeApply(_parametrization: Map<string,string>): void {    
  }

  // TODO verify that this is idempotent
  afterApply(platformModuleDir: string, parametrization: Map<string,string>): void {
    
    const bootstrapTerragrunt = path.join(platformModuleDir, "bootstrap", "terragrunt.hcl");
    const platformHCL = path.join(platformModuleDir, "platform.hcl");


    const existingProviderConfig =  '  generate "provider" {\n' +
                                    '    path      = "provider.tf"\n' +
                                    '    if_exists = "overwrite"\n' +
                                    '    contents  = <<EOF\n' +
                                    '  provider "google|aws|azurerm" {\n' +
                                    '    # todo\n' +
                                    '  }\n' +
                                    '  EOF\n' +
                                    '  }\n';

    const newProviderConfig = '  generate "provider" {\n' +
                              '  path      = "provider.tf"\n' +
                              '  if_exists = "overwrite"\n' +
                              '  contents  = <<EOF\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  skip_provider_registration = false\n' +
                              '  tenant_id                  = "\${include.platform.locals.platform.azure.aadTenantId}"\n' +
                              '  subscription_id            = "\${include.platform.locals.platform.azure.subscriptionId}"\n' +
                              '  storage_use_azuread        = true\n' +
                              '}\n' +
                              'provider "azuread" {\n' +
                              '  tenant_id = "\${include.platform.locals.platform.azure.aadTenantId}"\n' +
                              '}\n' +
                              'EOF\n' +
                              '}\n';

    const bootstrapConfigToken = '    # todo: specify inputs to terraform module';


    //FIXME yeah well this holds specific variables that need to be replaced ofc
    const bootStrapInputs = '    root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}\n' +
                            '    platform_engineers_members = [\n' +
                            '      "malhussan_meshcloud.io#EXT#@meshlandingzone.onmicrosoft.com",\n' +
                            '    ]\n' +
                            '    storage_account_name = "tfstaterandom52341"\n' +
                            '    tfstate_location     = "germanywestcentral"\n';

    const sharedConfigComment = "# define shared configuration here that's included by all terragrunt configurations in this platform"
    const addLocalsBlock = 'locals {\n' +    
                          '    platform = yamldecode(regex("^---([\\\\s\\\\S]*)\\\\n---\\\\n[\\\\s\\\\S]*$", file(".//README.md"))[0])\n' +
                          '}\n';

    const remoteStateConfig = '  # recommended: remote state configuration\n' +
                              '  remote_state {\n' +
                              '    backend = todo\n' +
                              '    generate = {\n' +
                              '      path      = "backend.tf"\n' +
                              '      if_exists = "overwrite"\n' +
                              '    }\n' +
                              '    config = {\n' +
                              '      # tip: use "my/path/${path_relative_to_include()}" to dynamically include the module id in a prefix\n' +
                              '    }\n' +
                              '  }';
                        

    // update bootstrap/terragrunt.hcl
    let text = Deno.readTextFileSync(bootstrapTerragrunt);    
    text = text.replace(existingProviderConfig, newProviderConfig);
    text = text.replace(bootstrapConfigToken, bootStrapInputs);
    text = text.replace('path = find_in_parent_folders("platform.hcl")', 'path = find_in_parent_folders("platform.hcl")\n    expose = true');
    Deno.writeTextFileSync(bootstrapTerragrunt, text);

    // update platform.hcl
    text = Deno.readTextFileSync(platformHCL);    
    text = text.replace(sharedConfigComment, `${sharedConfigComment}\n${addLocalsBlock}`); // <-- this is not idempotent!
    text = text.replace(remoteStateConfig, '');
    Deno.writeTextFileSync(platformHCL, text);
  }

  afterDeploy(_platformModuleDir: string, _parametrization: Map<string,string>): void {
  }

  betweenDeployments(platformModuleDir: string, parametrization: Map<string,string>): void {
  }
}
