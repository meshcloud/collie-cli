import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { InputParameter, KitBundle, KitDeployRepresentation, KitMetadata, KitRepresentation } from "./kitbundle.ts";

export class AzureKitBundle extends KitBundle {

  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  // Define Parameter names globally for easier change:
  const PARAM_ROOT_ID = "Root Id";
  const PARAM_ROOT_NAME = "Root Name";
  const PARAM_DEFAULT_LOCATION = "Default Location";

  kitsAndSources(): Map<string, KitRepresentation> {
    const bootstrapKitParams: InputParameter[] = [
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

    // TODO improve on those
    const baseKitParams: InputParameter[] = [
      {
        description: this.PARAM_ROOT_ID,
        validationRegex: /.*/,
        hint: undefined,
        validationFailureMessage: '',
      },
      {
        description: this.PARAM_ROOT_NAME,
        validationRegex: /.*/,
        hint: undefined,
        validationFailureMessage: '',
      },
      {
        description: this.PARAM_DEFAULT_LOCATION,
        validationRegex: /.*/,
        hint: undefined,
        validationFailureMessage: '',
      },
    ];

    return new Map<string, KitRepresentation>([

      ["bootstrap", new KitRepresentation(
        "https://github.com/meshcloud/landing-zone-construction-kit/archive/014e8d3d9432b2d18af5cde1ea28bfbab50c7832.tar.gz",
        "/kit/azure/bootstrap-es",
        bootstrapKitParams,
        undefined,
        new KitDeployRepresentation(0, true, this.betweenDeployments, { raw: ["apply"] }))
      ],

      ["base", new KitRepresentation(
        "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz",
         undefined,
         baseKitParams,
         new KitMetadata("Azure CAF Enterprise Scale", "todo description goes here"),
         undefined)
      ]

    ]);
  }

  beforeApply(_parametrization: Map<string,string>): void {
    // nothing to be done here
  }

  // TODO this should work when called again with different parametrization, but this is hard to archive without maintaining some kind of history.
  afterApplyBootstrap(platformModuleDir: string, parametrization: Map<string,string>): void {
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
                            `    foundation_name = "${parametrization.get('__foundation__')}"\n` +
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

  afterApplyBase(platformModuleDir: string, parametrization: Map<string,string>): void {
    const baseOutputTF = path.join(platformModuleDir, "base", "output.tf");
    const moduleHCL = path.join(platformModuleDir, "module.hcl");
    const baseTerragrunt = path.join(platformModuleDir, "base", "terragrunt.hcl");

    const outputBlockLS = '  value = {\n' +
      	                  '    management = azurerm_log_analytics_linked_service.management\n' +
                          '  }\n' +
                          '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const outputReplacementBlockLS = '  value = {\n' +
      	                  '    management = azurerm_log_analytics_linked_service.management\n' +
                          '    Sensitive = true\n'
                          '  }\n' +
                          '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const oldProvidersBlock = '  provider "todo" {
                              '    # tip: you can access collie configuration from the local above, e.g. "${local.platform.azure.aadTenantId}"\n' +
      	                      '    # tip: you can access bootstrap module output like secrets from the dependency above, e.g. "${dependency.bootstrap.outputs.client_secret}"\n' +
                              '  }';

    const newProvidersBlock = '\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  alias                      = "connectivity"\n' +
                              '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
                              '}\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  alias                      = "management"\n' +
                              '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
                              '}\n';

    const baseInputToken = '# todo: specify inputs to terraform module';

    const baseInputVariables = '\n' +
                               'root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
                               `root_id        = "${parametrization.get(this.PARAM_ROOT_ID)}"\n` +
                               `root_name      = "${parametrization.get(this.PARAM_ROOT_NAME)}"\n` +
                               `default_location = "${parametrization.get(this.PARAM_DEFAULT_LOCATION)}"\n` +
                               'deploy_corp_landing_zones = true\n' +
                               'deploy_online_landing_zones = true\n' +
                               '# Management resources\n' +
                               'deploy_management_resources = true\n' +
                               'subscription_id_management  = "${include.platform.locals.platform.azure.subscriptionId}" # Subscription created manually as a prerequisite\n';

    // update base/output.tf
    let text = Deno.readTextFileSync(baseOutputTF);
    text = text.replace(outputBlockLS, outputReplacementBlockLS);
    Deno.writeTextFileSync(baseOutputTF, text);

    // update module.hcl
    text = Deno.readTextFileSync(moduleHCL);
    text = text.replace(oldProvidersBlock, newProvidersBlock);
    Deno.writeTextFileSync(moduleHCL, text);

    // update base/terragrunt.hcl
    text = Deno.readTextFileSync(baseTerragrunt);
    text = text.replace(baseInputToken, baseInputVariables);
    Deno.writeTextFileSync(baseTerragrunt, text);
  }

  afterApply(platformModuleDir: string, parametrization: Map<string,string>): void {
    this.afterApplyBootstrap(platformModuleDir, parametrization);
    this.afterApplyBase(platformModuleDir, parametrization);
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
