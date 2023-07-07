import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";
import { TerraformDocsCliFacade } from "../../api/terraform-docs/TerraformDocsCliFacade.ts";
import { indent } from "../../cli/indent.ts";

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

export function generateDocumentationTf(
  content =
    `This documentation is intended as a summary of resources deployed and managed by this module for landing zone consumers
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
:::`,
) {
  return `variable "output_md_file" {
  type        = string
  description = "location of the file where this cloud foundation kit module generates its documentation output"
}

resource "local_file" "output_md" {
  filename = var.output_md_file
  content  = <<EOF
${content}
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

export async function generateTerragrunt(
  kitModulePath: string,
  terraformDocs: TerraformDocsCliFacade,
) {
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

  const tfvars = await terraformDocs.generateTfvars(kitModulePath);
  const inputsBlock = `inputs = {
  # todo: set input variables
${indent(tfvars, 2)}
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
export function ensureBackedUpFile(
  fileName: string,
  backupAppendix = "backup",
) {
  const backUpFileName = `${fileName}.${backupAppendix}`;
  let backUpExists = false;
  try {
    Deno.statSync(backUpFileName);
    backUpExists = true;
  } catch (_) {
    /* we assume the backUpFile does not exist, although error could have other reasons, such as permissions. */
  }

  if (backUpExists) {
    // load content from backUp and write into original file:
    const text = Deno.readTextFileSync(backUpFileName);
    Deno.writeTextFileSync(fileName, text, { append: false });
  } else {
    // write backup
    Deno.createSync(backUpFileName);
    const text = Deno.readTextFileSync(fileName);
    Deno.writeTextFileSync(backUpFileName, text, { append: false });
  }
}
