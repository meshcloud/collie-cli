import * as path from "std/path";
import * as colors from "std/fmt/colors";
import {
  KitBundle,
  KitDeployRepresentation,
  KitMetadata,
  KitRepresentation,
} from "./kitbundle.ts";
import { ensureBackedUpFile } from "../kit-utilities.ts";
import { InputParameter } from "../../InputParameter.ts";
import { SelectValueOptions } from "x/cliffy/prompt";
import { AzLocation } from "../../../api/az/Model.ts";

// Define Parameter names globally for easier change:
// bootstrap module
const PARAM_PE_UPN = "Platform Engineer UPN";
const PARAM_STORAGE_ACC_NAME = "Storage Account Name";
const PARAM_STORAGE_ACC_RG_NAME =
  "Name of the Resource Group holding the Storage Account";
const PARAM_TF_STATE_LOCATION = "Terraform State Location";

// base module
const PARAM_ROOT_ID = "Root Id";
const PARAM_ROOT_NAME = "Root Name";
const PARAM_DEFAULT_LOCATION = "Default Location";

// meshPlatform module: currently user does not need to add any input

export class AzureKitBundle extends KitBundle {
  locations: AzLocation[];

  constructor(locations: AzLocation[]) {
    const identifier = "azure-caf-es";
    const displayName = "Azure Enterprise Scale";
    const description =
      `This KitBundle consists of two kits: bootstrap and base. It allows you to set up a Azure LZ in only a few minutes. ` +
      `The bootstrap kit will be deployed automatically which provides a setup with remote Terraform state storage. ` +
      `The base kit will be configured during the apply process, but as a follow-up step you need to deploy it manually with\n${
        colors.italic(
          colors.green("$ collie foundation deploy <foundation> --module base"),
        )
      }\n` +
      `It contains resources from the Azure landing zone Terraform module based on Enterprise Scale conceptual architecture:\n${
        colors.italic(
          colors.blue(
            "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale",
          ),
        )
      }\n` +
      `To have a quick glance on its capabilities after setting it up, consider a look on the Cloudfoundation Maturity Model here:\n${
        colors.italic(
          colors.blue(
            "https://cloudfoundation.meshcloud.io/maturity-model/?selectedTool=Azure%20LZ%20Terraform%20module%20-%20ES",
          ),
        )
      }`;

    super(identifier, displayName, description);
    this.locations = locations;
  }

  kitsAndSources(): Map<string, KitRepresentation> {
    const azureLocationOptions: SelectValueOptions = this.locations.map((
      location: AzLocation,
    ) => ({
      name: location.displayName,
      value: location.name,
    }));
    const bootstrapKitParams: InputParameter[] = [
      {
        description: PARAM_PE_UPN,
        validationRegex: /.*/,
        hint:
          "This is the UPN of the Platform Engineer that should be the first initial member with access to the remote TF state. (Most probably yourself)",
        validationFailureMessage: "Please enter a valid UPN.",
      },
      {
        description: PARAM_STORAGE_ACC_RG_NAME,
        validationRegex: /^[a-zA-Z0-9-_]*$/,
        hint:
          "Name of the Resource Group that holds the remove Terraform State after the bootstrap process.",
        validationFailureMessage:
          "Please enter a valid resource group name (alphanumerics '-' and '_' only).",
      },
      {
        description: PARAM_STORAGE_ACC_NAME,
        validationRegex: /^[a-zA-Z0-9]{2,24}$/,
        hint:
          "Unique name of the Storage Account, where the remote TF state will be stored. (2-24 alphanumerics)",
        validationFailureMessage:
          "Please enter a valid storage account name. (2-24 alphanumerics)",
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
        validationFailureMessage: "",
      },
      {
        description: PARAM_ROOT_NAME,
        validationRegex: /.*/,
        hint: "Human readable name of the Root Management Group.",
        validationFailureMessage: "",
      },
      {
        description: PARAM_DEFAULT_LOCATION,
        hint: "Target location for deploying your LZ resources to.",
        options: azureLocationOptions,
      },
    ];

    const meshPlatformKitParams: InputParameter[] = [];

    return new Map<string, KitRepresentation>([
      [
        "bootstrap",
        new KitRepresentation(
          "https://github.com/meshcloud/landing-zone-construction-kit/archive/c8e08ecba445e529153ae9ef1892349f76fcbcb4.tar.gz",
          "/kit/azure/bootstrap-es",
          bootstrapKitParams,
          undefined,
          new KitDeployRepresentation(0, true, this.betweenDeployments, {
            raw: ["apply"],
          }),
        ),
      ],

      [
        "base",
        new KitRepresentation(
          "https://github.com/Azure/terraform-azurerm-caf-enterprise-scale/archive/refs/tags/v2.4.1.tar.gz",
          undefined,
          baseKitParams,
          new KitMetadata(
            "Azure CAF Enterprise Scale",
            "todo description goes here",
          ),
          undefined,
        ),
      ],

      [
        "meshPlatform",
        new KitRepresentation(
          "https://github.com/meshcloud/terraform-azure-meshplatform/archive/fa13447115c451f25496430b37fc560c650f1808.tar.gz",
          undefined,
          meshPlatformKitParams,
          new KitMetadata(
            "Azure meshPlatform Module",
            "Terraform module to integrate Azure as a meshPlatform into meshStack instance",
          ),
          undefined,
        ),
      ],
    ]);
  }

  beforeApply(_parametrization: Map<string, string>): void {
    // nothing to be done here
  }

  afterApplyBootstrap(
    platformModuleDir: string,
    _kitDir: string,
    parametrization: Map<string, string>,
  ): void {
    const bootstrapTerragrunt = path.join(
      platformModuleDir,
      "bootstrap",
      "terragrunt.hcl",
    );
    const platformHCL = path.join(platformModuleDir, "platform.hcl");

    ensureBackedUpFile(platformHCL);
    ensureBackedUpFile(bootstrapTerragrunt);

    const existingProviderConfig = '  generate "provider" {\n' +
      '    path      = "provider.tf"\n' +
      '    if_exists = "overwrite"\n' +
      "    contents  = <<EOF\n" +
      '  provider "google|aws|azurerm" {\n' +
      "    # todo\n" +
      "  }\n" +
      "  EOF\n" +
      "  }\n";

    const newProviderConfig = '  generate "provider" {\n' +
      '  path      = "provider.tf"\n' +
      '  if_exists = "overwrite"\n' +
      "  contents  = <<EOF\n" +
      'provider "azurerm" {\n' +
      "  features {}\n" +
      "  skip_provider_registration = false\n" +
      '  tenant_id                  = "\${include.platform.locals.platform.azure.aadTenantId}"\n' +
      '  subscription_id            = "\${include.platform.locals.platform.azure.subscriptionId}"\n' +
      "  storage_use_azuread        = true\n" +
      "}\n" +
      'provider "azuread" {\n' +
      '  tenant_id = "\${include.platform.locals.platform.azure.aadTenantId}"\n' +
      "}\n" +
      "EOF\n" +
      "}\n";

    const bootstrapConfigToken =
      "    # todo: specify inputs to terraform module";

    const bootStrapInputs =
      '    root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
      `    foundation_name = "${parametrization.get("__foundation__")}"\n` +
      "    platform_engineers_members = [\n" +
      `      "${parametrization.get(PARAM_PE_UPN)}",\n` +
      "    ]\n" +
      `    storage_account_name = "${
        parametrization.get(PARAM_STORAGE_ACC_NAME)
      }"\n` +
      `    storage_rg_name = "${
        parametrization.get(PARAM_STORAGE_ACC_RG_NAME)
      }"\n` +
      `    tfstate_location     = "${
        parametrization.get(PARAM_TF_STATE_LOCATION)
      }"\n`;

    const sharedConfigComment =
      "# define shared configuration here that's included by all terragrunt configurations in this platform";
    const addLocalsBlock = "locals {\n" +
      '    platform = yamldecode(regex("^---([\\\\s\\\\S]*)\\\\n---\\\\n[\\\\s\\\\S]*$", file(".//README.md"))[0])\n' +
      "}\n";

    const remoteStateConfig = "  # recommended: remote state configuration\n" +
      "  remote_state {\n" +
      "    backend = todo\n" +
      "    generate = {\n" +
      '      path      = "backend.tf"\n' +
      '      if_exists = "overwrite"\n' +
      "    }\n" +
      "    config = {\n" +
      '      # tip: use "my/path/${path_relative_to_include()}" to dynamically include the module id in a prefix\n' +
      "    }\n" +
      "  }";

    // update bootstrap/terragrunt.hcl
    let text = Deno.readTextFileSync(bootstrapTerragrunt);
    text = text.replace(existingProviderConfig, newProviderConfig);
    text = text.replace(bootstrapConfigToken, bootStrapInputs);
    text = text.replace(
      'path = find_in_parent_folders("platform.hcl")',
      'path = find_in_parent_folders("platform.hcl")\n    expose = true',
    );
    Deno.writeTextFileSync(bootstrapTerragrunt, text);

    // update platform.hcl
    text = Deno.readTextFileSync(platformHCL);
    text = text.replace(sharedConfigComment, addLocalsBlock);
    text = text.replace(remoteStateConfig, "");
    Deno.writeTextFileSync(platformHCL, text);
  }

  afterApplyBase(
    platformModuleDir: string,
    kitDir: string,
    parametrization: Map<string, string>,
  ): void {
    const baseOutputTF = path.join(kitDir, "base", "outputs.tf");
    const moduleHCL = path.join(platformModuleDir, "module.hcl");
    const baseTerragrunt = path.join(
      platformModuleDir,
      "base",
      "terragrunt.hcl",
    );

    ensureBackedUpFile(moduleHCL);
    ensureBackedUpFile(baseTerragrunt);

    const outputBlockLS = "  value = {\n" +
      "    management = azurerm_log_analytics_linked_service.management\n" +
      "  }\n" +
      '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const outputReplacementBlockLS = "  value = {\n" +
      "    management = azurerm_log_analytics_linked_service.management\n" +
      "  }\n" +
      "  sensitive = true\n" +
      '  description = "Returns the configuration data for all Log Analytics linked services created by this module."';

    const outputBlockAA = "  value = {\n" +
      "    management = azurerm_automation_account.management\n" +
      "  }\n" +
      '  description = "Returns the configuration data for all Automation Accounts created by this module."';

    const outputReplacementBlockAA = "  value = {\n" +
      "    management = azurerm_automation_account.management\n" +
      "  }\n" +
      "  sensitive = true\n" +
      '  description = "Returns the configuration data for all Automation Accounts created by this module."';

    const oldProvidersBlock = '  provider "todo" {\n' +
      '    # tip: you can access collie configuration from the local above, e.g. "${local.platform.azure.aadTenantId}"\n' +
      '    # tip: you can access bootstrap module output like secrets from the dependency above, e.g. "${dependency.bootstrap.outputs.client_secret}"\n' +
      "  }";

    const newProvidersBlock = "\n" +
      'provider "azurerm" {\n' +
      "  features {}\n" +
      "  skip_provider_registration = false\n" +
      '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
      '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
      '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
      '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
      "}\n" +
      'provider "azurerm" {\n' +
      "  features {}\n" +
      '  alias                      = "connectivity"\n' +
      '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
      '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
      '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
      '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
      "}\n" +
      'provider "azurerm" {\n' +
      "  features {}\n" +
      '  alias                      = "management"\n' +
      '  subscription_id            = "${local.platform.azure.subscriptionId}"\n' +
      '  tenant_id                  = "${local.platform.azure.aadTenantId}"\n' +
      '  client_id                  = "${dependency.bootstrap.outputs.client_id}"\n' +
      '  client_secret              = "${dependency.bootstrap.outputs.client_secret}"\n' +
      "}\n";

    const baseIncludeOld = 'path = find_in_parent_folders("platform.hcl")';

    const baseIncludeNew =
      'path = find_in_parent_folders("platform.hcl")\n    expose = true';

    const baseInputToken = "# todo: specify inputs to terraform module";

    const baseInputVariables = "\n" +
      '  root_parent_id = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
      `  root_id        = "${parametrization.get(PARAM_ROOT_ID)}"\n` +
      `  root_name      = "${parametrization.get(PARAM_ROOT_NAME)}"\n` +
      `  default_location = "${
        parametrization.get(PARAM_DEFAULT_LOCATION)
      }"\n` +
      "  deploy_corp_landing_zones = true\n" +
      "  deploy_online_landing_zones = true\n" +
      "  # Management resources\n" +
      "  deploy_management_resources = true\n" +
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

  afterApplyMeshPlatform(
    platformModuleDir: string,
    __kitDir: string,
    parametrization: Map<string, string>,
  ): void {
    const meshPlatformTerragrunt = path.join(
      platformModuleDir,
      "meshPlatform",
      "terragrunt.hcl",
    );

    const meshPlatformIncludeOld =
      'path = find_in_parent_folders("platform.hcl")';

    const meshPlatformIncludeNew =
      'path = find_in_parent_folders("platform.hcl")\n    expose = true';

    const meshPlatformInputToken = "# todo: specify inputs to terraform module";

    const meshPlatformInputVariables = "\n" +
      `    service_principal_name_suffix = "${
        parametrization.get("__foundation__")
      }"\n` +
      '    mgmt_group_name    = "${include.platform.locals.platform.azure.aadTenantId}"\n' +
      "    replicator_enabled = true\n" +
      "    kraken_enabled     = false\n" +
      "    idplookup_enabled  = false\n";

    // update meshPlatform/terragrunt.hcl
    let text = Deno.readTextFileSync(meshPlatformTerragrunt);
    text = text.replace(meshPlatformIncludeOld, meshPlatformIncludeNew);
    text = text.replace(meshPlatformInputToken, meshPlatformInputVariables);
    Deno.writeTextFileSync(meshPlatformTerragrunt, text);
  }

  afterApply(
    platformModuleDir: string,
    kitDir: string,
    parametrization: Map<string, string>,
  ): void {
    this.afterApplyBootstrap(platformModuleDir, kitDir, parametrization);
    this.afterApplyBase(platformModuleDir, kitDir, parametrization);
    this.afterApplyMeshPlatform(platformModuleDir, kitDir, parametrization);
  }

  afterDeploy(
    _platformModuleDir: string,
    _parametrization: Map<string, string>,
  ): void {
    // nothing to be done here
  }

  betweenDeployments(
    platformModuleDir: string,
    parametrization: Map<string, string>,
  ): void {
    const platformHCL = path.join(platformModuleDir, "platform.hcl");

    const backendDef = "# recommended: remote state configuration\n" +
      'generate "backend" {\n' +
      '  path      = "backend.tf"\n' +
      '  if_exists = "overwrite"\n' +
      "  contents  = <<EOF\n" +
      "terraform {\n" +
      '  backend "azurerm" {\n' +
      '    tenant_id            = "${local.platform.azure.aadTenantId}"\n' +
      '    subscription_id      = "${local.platform.azure.subscriptionId}"\n' +
      `    resource_group_name  = "${
        parametrization.get(PARAM_STORAGE_ACC_RG_NAME)
      }"\n` +
      `    storage_account_name = "${
        parametrization.get(PARAM_STORAGE_ACC_NAME)
      }"\n` +
      '    container_name       = "tfstate"\n' +
      '    key                  = "${path_relative_to_include()}.tfstate"\n' +
      "  }\n" +
      "}\n" +
      "EOF\n" +
      "}\n";

    let text = Deno.readTextFileSync(platformHCL);
    text = text + "\n" + backendDef;
    Deno.writeTextFileSync(platformHCL, text);
  }
}
