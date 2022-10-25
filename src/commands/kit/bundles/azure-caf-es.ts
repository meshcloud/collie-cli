import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { InputParameter, KitBundle, KitDeployRepresentation, KitMetadata, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {

  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    const bootstrapParams: InputParameter[] = [
      {
        description: "Platform Engineer Email",
        // validating e-mails by regex is generally considered a futile attempt, so we accept everything.
        validationRegex: /.*/,
        hint: undefined,
        validationFailureMessage: 'Please enter a valid e-mail address.',
      },
      {
        description: "Storage Account Name",
        validationRegex: /^[a-zA-Z0-9_.-@#]+$/,  //TODO validate that this is sufficient
        hint: undefined,
        validationFailureMessage: 'Please enter a valid storage account name.',
      },
      {
        description: "Terraform State Location",
        validationRegex: /^[a-z0-9]+$/,
        hint: "The Azure availability zone, formatted in lower case and without spaces, e.g. \"germanywestcentral\". " +
          "For a full list of supported availability zones, see: https://learn.microsoft.com/en-us/azure/availability-zones/az-overview",
        validationFailureMessage: 'Please enter a valid azure availability zone.',
      },
    ];
    const baseParams: InputParameter[] = [
      {
        description: 'param3', // FIXME
        validationRegex: /.*/,
        hint: undefined,
        validationFailureMessage: 'Input rejected.'
      },
    ];

    return new Map<string, KitRepresentation>([

      ["bootstrap", new KitRepresentation(
        "https://github.com/meshcloud/landing-zone-construction-kit/archive/a2426aa85550941bc156d5a68965ca8f45bc7442.tar.gz",
        "/kit/azure/bootstrap-es",
        bootstrapParams,
        undefined,
        new KitDeployRepresentation(0, true, this.betweenDeployments, { raw: [] }))
      ],

      ["base", new KitRepresentation(
        "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz",
         undefined,
         baseParams,
         new KitMetadata("Azure CAF Enterprise Scale", "todo description goes here"),
         undefined)
      ]

    ]);
  }

  beforeApply(_parametrization: Map<string,string>): void {
    // nothing to be done here
  }

  // TODO this should work when called again with different parametrization, but this is hard to archive without maintaining some kind of history.
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

    const bootStrapInputs = '    root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
                            '    platform_engineers_members = [\n' +
                            `      "${parametrization.get('Platform Engineer Email')}",\n` +
                            '    ]\n' +
                            `    storage_account_name = "${parametrization.get('Storage Account Name')}"\n` +
                            `    tfstate_location     = "${parametrization.get('Terraform State Location')}"\n`;

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
    text = text.replace(sharedConfigComment, `${addLocalsBlock}`);
    text = text.replace(remoteStateConfig, '');
    Deno.writeTextFileSync(platformHCL, text);
  }

  afterDeploy(_platformModuleDir: string, _parametrization: Map<string,string>): void {
    // nothing to be done here
  }

  betweenDeployments(platformModuleDir: string, parametrization: Map<string,string>): void {
    const platformHCL = path.join(platformModuleDir, "platform.hcl");

    const backendDef = '# recommended: remote state configuration\n' +
                       'generate "backend" {\n' +
                       '  path      = "backend.tf"\n' +
                       '  if_exists = "overwrite"\n' +
                       '  contents  = <<EOF\n' +
                       'terraform {\n' +
                       '  backend "azurerm" {\n' +
                       '    tenant_id            = "${local.platform.azure.aadTenantId}"\n' +
                       '    subscription_id      = "${local.platform.azure.subscriptionId}"\n' +
                       '    resource_group_name  = "tfstate"\n' +
                       `    storage_account_name = "${parametrization.get('Storage Account Name')}"\n` +
                       '    container_name       = "tfstate"\n' +
                       '    key                  = "${path_relative_to_include()}.tfstate"\n' +
                       '  }\n' +
                       '}\n' +
                       'EOF\n' +
                       '}\n';

    let text = Deno.readTextFileSync(platformHCL);
    text = text + "\n" + backendDef;
    Deno.writeTextFileSync(platformHCL, text);
  }
}
