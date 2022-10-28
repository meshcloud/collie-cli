import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { PlatformConfig } from "../../model/PlatformConfig.ts";

export async function newKitDirectoryCreation(
  modulePath: string,
  name: string,
  logger: Logger,
) {
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const d: Dir = {
    name: modulePath,
    entries: [
      { name: "main.tf", content: mainTf },
      {
        name: "documentation.tf",
        content: generateDocumentationTf(),
      },
      { name: "README.md", content: generateReadmeMd(name) },
      { name: "variables.tf", content: "" },
      { name: "outputs.tf", content: "" },
    ],
  };

  await dir.write(d, "");
}

export async function emptyKitDirectoryCreation(
  modulePath: string,
  logger: Logger,
) {
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const d: Dir = {
    name: modulePath,
    entries: [],
  };

  await dir.write(d, "");
}

const mainTf = `# Place your module's terraform resources here as usual.
# Note that you should typically not put a terraform{} block into cloud foundation kit modules,
# these will be provided by the platform implementations using this kit module.
`;

function generateDocumentationTf() {
  return `variable "output_md_file" {
    type        = string
    description = "location of the file where this cloud foundation kit module generates its documentation output"
  }

  resource "local_file" "output_md" {
    filename = var.output_md_file
    content = <<EOF
  This documentation is intended as a summary of resources deployed and managed by this module for landing zone consumers
  and security auditors.

  ### TODO

  TODO: describe the deployed resources and its configuration in a human-friendly way.

  ::: tip
  Here are some useful tips

  - This file is proper \`markdown\`.
  - Use h3 and h4 level headings to add sections to the kit module description
  - You can use terraform variables, resources and outputs defined anywhere in this terraform module, to templatise it,
    e.g. this is the location where this documentation comes from: \`\${var.output_md_file}\`
  - Leverage terraform's \`templatefile()\` function for more complex templates
  :::
  EOF
  }
  `;
}

function generateReadmeMd(moduleName: string) {
  return `---
  name: ${moduleName}
  summary: |
    deploys new cloud foundation infrastructure.
    Add a concise description of the module's purpose here.
  # optional: add additional metadata about implemented security controls
  ---

  # ${moduleName}

  This documentation is intended as a reference documentation for cloud foundation or platform engineers using this module.
    `;
}

export function generatePlatformConfiguration(
  foundationRepo: FoundationRepository,
  platformConfig: PlatformConfig,
  dir: DirectoryGenerator,
) {
  const platformHcl =
    `# define shared configuration here that's included by all terragrunt configurations in this platform

  # recommended: remote state configuration
  remote_state {
    backend = todo
    generate = {
      path      = "backend.tf"
      if_exists = "overwrite"
    }
    config = {
      # tip: use "my/path/\${path_relative_to_include()}" to dynamically include the module id in a prefix
    }
  }

  # recommended: enable documentation generation for kit modules
  inputs = {
    output_md_file = "\${get_path_to_repo_root()}/../output.md"
  }
  `;

  const moduleHcl =
    `# define shared configuration here that most non-bootstrap modules in this platform want to include

  # optional: make collie's platform config available in terragrunt by parsing frontmatter
  locals {
    platform = yamldecode(regex("^---([\\\\s\\\\S]*)\\\\n---\\\\n[\\\\s\\\\S]*$", file(".//README.md"))[0])
  }

  # optional: reference the bootstrap module to access its outputs
  dependency "bootstrap" {
    config_path = "\${path_relative_from_include()}/bootstrap"
  }

  # recommended: generate a default provider configuration
  generate "provider" {
    path      = "provider.tf"
    if_exists = "overwrite"
    contents  = <<EOF
  provider "todo" {
    # tip: you can access collie configuration from the local above, e.g. "\${local.platform.azure.aadTenantId}"
    # tip: you can access bootstrap module output like secrets from the dependency above, e.g. "\${dependency.bootstrap.outputs.client_secret}"
  }
  EOF
  }
  `;
  const platformDir = {
    name: foundationRepo.resolvePlatformPath(platformConfig),
    entries: [
      {
        name: "platform.hcl",
        content: platformHcl,
      },
      {
        name: "module.hcl",
        content: moduleHcl,
      },
    ],
  };
  dir.write(platformDir, "");
}

export function generateTerragrunt(kitModulePath: string) {
  const isBootstrap = kitModulePath.endsWith(`${path.SEP}bootstrap`);

  // terragrunt needs a posix style path
  const posixKitModulePath = kitModulePath.replaceAll("\\", "/");

  const platformIncludeBlock = `include "platform" {
    path = find_in_parent_folders("platform.hcl")
  }`;

  const moduleIncludeBlock = `include "module" {
    path = find_in_parent_folders("module.hcl")
  }`;

  const bootstrapProviderBlock =
    `# todo: this is a bootstrap module, you typically want to set up a provider
  # with user credentials (cloud CLI based authentication) here
  generate "provider" {
    path      = "provider.tf"
    if_exists = "overwrite"
    contents  = <<EOF
  provider "google|aws|azurerm" {
    # todo
  }
  EOF
  }`;

  const terraformBlock = `terraform {
    source = "\${get_repo_root()}//${posixKitModulePath}"
  }`;

  const inputsBlock = `inputs = {
    # todo: specify inputs to terraform module
  }`;

  return [
    platformIncludeBlock,
    isBootstrap ? bootstrapProviderBlock : moduleIncludeBlock,
    terraformBlock,
    inputsBlock,
  ].join("\n\n");
}

/**
 * This function will:
 * - create a backup file only if none exists yet
 * - override given file with it's backup, if a backup file exists
 *
 * This helps to ensure a certain consistent file content before accessing this file.
 */
export function ensureBackedUpFile(fileName: string, backupAppendix = "backup") {
  const backUpFileName = `${fileName}.${backupAppendix}`;
  let backUpExists = false;
  try {
    Deno.statSync(backUpFileName);
    backUpExists = true;
  } catch(_) { /* we assume the backUpFile does not exist, although error could have other reasons, such as permissions. */ }

  if (backUpExists) {
    // load content from backUp and write into original file:
    const text = Deno.readTextFileSync(backUpFileName);
    Deno.writeTextFileSync(fileName, text, { append: false })
  } else {
    // write backup
    Deno.createSync(backUpFileName);
    const text = Deno.readTextFileSync(fileName);
    Deno.writeTextFileSync(backUpFileName, text, { append: false })
  }
}