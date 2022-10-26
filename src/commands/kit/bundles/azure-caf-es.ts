import * as path from "std/path";
import { InputParameter, KitBundle, KitDeployRepresentation, KitMetadata, KitRepresentation } from "./kitbundle.ts";

  // Define Parameter names globally for easier change:
  // bootstrap module
  const PARAM_PE_EMAIL = "Platform Engineer Email";
  const PARAM_STORAGE_ACC_NAME = "Storage Account Name";
  const PARAM_TF_STATE_LOCATION = "Terraform State Location";
  // base module
  const PARAM_ROOT_ID = "Root Id";
  const PARAM_ROOT_NAME = "Root Name";
  const PARAM_DEFAULT_LOCATION = "Default Location";
  // meshPlatform module
  const PARAM_SP_NAME_SUFFIX = "Service Principal Name Suffix";

export class AzureKitBundle extends KitBundle {

  constructor(identifier: string, displayName: string) {
    super(identifier, displayName);
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    const bootstrapKitParams: InputParameter[] = [
      {
        description: PARAM_PE_EMAIL,
        // validating e-mails by regex is generally considered a futile attempt,
        // so we accept everything that includes a @.
        validationRegex: /.+@.+/,
        hint: "This is the email address of the Platform Engineer that should be the first initial member with access to the remote TF state. (Most probably yourself)",
        validationFailureMessage: 'Please enter a valid e-mail address.',
      },
      {
        description: PARAM_STORAGE_ACC_NAME,
        validationRegex: /^[a-zA-Z0-9]{2,24}$/,
        hint: "Unique name of the Storage Account, where the remote TF state will be stored. (2-24 alphanumerics)",
        validationFailureMessage: 'Please enter a valid storage account name.',
      },
      {
        description: PARAM_TF_STATE_LOCATION,
        hint: "Location of the Storage Account holding the remote TF state.",
        options: azureLocationOptions,
      },
    ];

    const baseKitParams: InputParameter[] = [
      {
        description: PARAM_ROOT_ID,
        validationRegex: /.*/,
        hint: "Identifier of the Root Management Group.",
        validationFailureMessage: '',
      },
      {
        description: PARAM_ROOT_NAME,
        validationRegex: /.*/,
        hint: "Human readable name of the Root Management Group.",
        validationFailureMessage: '',
      },
      {
        description: PARAM_DEFAULT_LOCATION,
        hint: "Target location for deploying your LZ resources to.",
        options: azureLocationOptions,
      },
    ];

    const meshPlatformKitParams: InputParameter[] = [
      {
        description: PARAM_SP_NAME_SUFFIX,
        validationRegex: /.*/,
        hint: "The suffix string that will be appended to the Service Principal's name for better searchability.",
        validationFailureMessage: '',
      },
    ];

    return new Map<string, KitRepresentation>([

      ["bootstrap", new KitRepresentation(
        "https://github.com/meshcloud/landing-zone-construction-kit/archive/530675fd541e2d7209dd522e26ae031618354245.tar.gz",
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
      ],

      ["meshPlatform", new KitRepresentation(
        "https://github.com/meshcloud/terraform-azure-meshplatform/archive/fa13447115c451f25496430b37fc560c650f1808.tar.gz",
        "/examples/basic-azure-integration",
        meshPlatformKitParams,
        new KitMetadata("Azure meshPlatform Module", "Terraform module to integrate Azure as a meshPlatform into meshStack instance"),
        undefined)
      ]
    ]);
  }

  beforeApply(_parametrization: Map<string,string>): void {
    // nothing to be done here
  }

  // TODO this should work when called again with different parametrization, but this is hard to archive without maintaining some kind of history.
  afterApplyBootstrap(platformModuleDir: string,  _kitDir: string, parametrization: Map<string,string>): void {
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
                            `      "${parametrization.get(PARAM_PE_EMAIL)}",\n` +
                            '    ]\n' +
                            `    storage_account_name = "${parametrization.get(PARAM_STORAGE_ACC_NAME)}"\n` +
                            `    tfstate_location     = "${parametrization.get(PARAM_TF_STATE_LOCATION)}"\n`;

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

  afterApplyBase(platformModuleDir: string, kitDir: string, parametrization: Map<string,string>): void {
    const baseOutputTF = path.join(kitDir, "base", "outputs.tf");
    const moduleHCL = path.join(platformModuleDir, "module.hcl");
    const baseTerragrunt = path.join(platformModuleDir, "base", "terragrunt.hcl");

    const outputBlockLS = '  value = {\n' +
      	                  '    management = azurerm_log_analytics_linked_service.management\n' +
                          '  }\n' +
                          '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const outputReplacementBlockLS = '  value = {\n' +
      	                  '    management = azurerm_log_analytics_linked_service.management\n' +
                          '  }\n' +
                          '  sensitive = true\n' +
                          '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const outputBlockAA = '  value = {\n' +
                          '    management = azurerm_automation_account.management\n' +
                          '  }\n' +
                          '  description = "Returns the configuration data for all Automation Accounts created by this module."';

    const outputReplacementBlockAA = '  value = {\n' +
                          '    management = azurerm_automation_account.management\n' +
                          '  }\n' +
                          '  sensitive = true\n' +
                          '  description = "Returns the configuration data for all Automation Accounts created by this module."';

    const oldProvidersBlock = '  provider "todo" {\n' +
                              '    # tip: you can access collie configuration from the local above, e.g. "${local.platform.azure.aadTenantId}"\n' +
      	                      '    # tip: you can access bootstrap module output like secrets from the dependency above, e.g. "${dependency.bootstrap.outputs.client_secret}"\n' +
                              '  }';

    const newProvidersBlock = '\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  skip_provider_registration = false\n' +
                              '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
                              '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
                              '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
                              '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
                              '}\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  alias                      = "connectivity"\n' +
                              '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
                              '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
                              '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
                              '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
                              '}\n' +
                              'provider "azurerm" {\n' +
                              '  features {}\n' +
                              '  alias                      = "management"\n' +
                              '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
                              '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
                              '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
                              '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
                              '}\n';

    const baseIncludeOld = 'path = find_in_parent_folders("platform.hcl")';

    const baseIncludeNew = 'path = find_in_parent_folders("platform.hcl")\n    expose = true';

    const baseInputToken = '# todo: specify inputs to terraform module';

    const baseInputVariables = '\n' +
                               '  root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
                               `  root_id        = "${parametrization.get(PARAM_ROOT_ID)}"\n` +
                               `  root_name      = "${parametrization.get(PARAM_ROOT_NAME)}"\n` +
                               `  default_location = "${parametrization.get(PARAM_DEFAULT_LOCATION)}"\n` +
                               '  deploy_corp_landing_zones = true\n' +
                               '  deploy_online_landing_zones = true\n' +
                               '  # Management resources\n' +
                               '  deploy_management_resources = true\n' +
                               '  subscription_id_management  = "${include.platform.locals.platform.azure.subscriptionId}" # Subscription created manually as a prerequisite\n';

    // update base/output.tf
    let text = Deno.readTextFileSync(baseOutputTF);
    text = text.replace(outputBlockLS, outputReplacementBlockLS);
    text = text.replace(outputBlockAA, outputReplacementBlockAA);
    Deno.writeTextFileSync(baseOutputTF, text);

    // update module.hcl
    text = Deno.readTextFileSync(moduleHCL);
    text = text.replace(oldProvidersBlock, newProvidersBlock);
    Deno.writeTextFileSync(moduleHCL, text);

    // update base/terragrunt.hcl
    text = Deno.readTextFileSync(baseTerragrunt);
    text = text.replace(baseIncludeOld, baseIncludeNew);
    text = text.replace(baseInputToken, baseInputVariables);
    Deno.writeTextFileSync(baseTerragrunt, text);
  }

  afterApplyMeshPlatform(platformModuleDir: string, kitDir: string, parametrization: Map<string,string>): void {

  };

  afterApply(platformModuleDir: string, kitDir: string, parametrization: Map<string,string>): void {
    this.afterApplyBootstrap(platformModuleDir, kitDir, parametrization);
    this.afterApplyBase(platformModuleDir, kitDir, parametrization);
    this.afterApplyMeshPlatform(platformModuleDir, kitDir, parametrization);
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
                       `    storage_account_name = "${parametrization.get(PARAM_STORAGE_ACC_NAME)}"\n` +
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

// TODO instead of hardcoding all locations, we should fetch them via az cli: "az account list-locations"
// For comparison, see AwsCliFacade.ts, which already includes the method listRegions. We need something
// comparable, but for Azure.
const azureLocationOptions = [
  { name: "Germany North", value: "germanynorth" },
  { name: "Germany West Central", value: "germanywestcentral" },
  { name: "Australia Central", value: "australiacentral" },
  { name: "Australia Central 2", value: "australiacentral2" },
  { name: "Australia East", value: "australiaeast" },
  { name: "Australia Southeast", value: "australiasoutheast" },
  { name: "Brazil South", value: "brazilsouth" },
  { name: "Brazil Southeast", value: "brazilsoutheast" },
  { name: "Canada Central", value: "canadacentral" },
  { name: "Canada East", value: "canadaeast" },
  { name: "Central India", value: "centralindia" },
  { name: "Central US", value: "centralus" },
  { name: "Central US EUAP", value: "centraluseuap" },
  { name: "East Asia", value: "eastasia" },
  { name: "East US", value: "eastus" },
  { name: "East US 2", value: "eastus2" },
  { name: "East US 2 EUAP", value: "eastus2euap" },
  { name: "East US STG", value: "eastusstg" },
  { name: "France Central", value: "francecentral" },
  { name: "France South", value: "francesouth" },
  { name: "Japan East", value: "japaneast" },
  { name: "Japan West", value: "japanwest" },
  { name: "Jio India Central", value: "jioindiacentral" },
  { name: "Jio India West", value: "jioindiawest" },
  { name: "Korea Central", value: "koreacentral" },
  { name: "Korea South", value: "koreasouth" },
  { name: "North Central US", value: "northcentralus" },
  { name: "North Europe", value: "northeurope" },
  { name: "Norway East", value: "norwayeast" },
  { name: "Norway West", value: "norwaywest" },
  { name: "Qatar Central", value: "qatarcentral" },
  { name: "South Africa North", value: "southafricanorth" },
  { name: "South Africa West", value: "southafricawest" },
  { name: "South Central US", value: "southcentralus" },
  { name: "South Central US STG", value: "southcentralusstg" },
  { name: "South India", value: "southindia" },
  { name: "Southeast Asia", value: "southeastasia" },
  { name: "Sweden Central", value: "swedencentral" },
  { name: "Switzerland North", value: "switzerlandnorth" },
  { name: "Switzerland West", value: "switzerlandwest" },
  { name: "UAE Central", value: "uaecentral" },
  { name: "UAE North", value: "uaenorth" },
  { name: "UK South", value: "uksouth" },
  { name: "UK West", value: "ukwest" },
  { name: "West Central US", value: "westcentralus" },
  { name: "West Europe", value: "westeurope" },
  { name: "West India", value: "westindia" },
  { name: "West US", value: "westus" },
  { name: "West US 2", value: "westus2" },
  { name: "West US 3", value: "westus3" }
]