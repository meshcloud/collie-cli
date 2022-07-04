import * as colors from "std/fmt/colors";
import * as path from "std/path";

import { Command, Select } from "../../deps.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { Logger } from "../../cli/Logger.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { CommandOptionError } from "../CommandOptionError.ts";
import { PlatformConfig } from "../../model/PlatformConfig.ts";

interface ApplyOptions {
  foundation?: string;
  platform?: string;
}
export function registerApplyCmd(program: Command) {
  program
    .command("apply [module]")
    .option("-f, --foundation <foundation:string>", "foundation")
    .option("-p, --platform <platform:platform>", "platform", {
      depends: ["foundation"],
    })
    .description(
      "Generate a platform module applying a kit module to a cloud platform",
    )
    .action(
      async (opts: GlobalCommandOptions & ApplyOptions, moduleId: string) => {
        const collie = new CollieRepository("./");
        const logger = new Logger(collie, opts);
        const validator = new ModelValidator(logger);

        const moduleRepo = await KitModuleRepository.load(
          collie,
          validator,
          logger,
        );

        moduleId = moduleId || (await selectModule(moduleRepo));
        const module = moduleRepo.tryFindById(moduleId);
        if (!module) {
          throw new CommandOptionError(
            "Could not find a module with id " + moduleId,
          );
        }

        const foundation = opts.foundation ||
          (await InteractivePrompts.selectFoundation(collie));

        const foundationRepo = await FoundationRepository.load(
          collie,
          foundation,
          validator,
        );

        const platform = opts.platform ||
          (await InteractivePrompts.selectPlatform(foundationRepo));

        // by convention, the module id looks like $platform/...
        const platformConfig = foundationRepo.findPlatform(platform);

        const dir = new DirectoryGenerator(WriteMode.skip, logger);

        generatePlatformConfiguration(foundationRepo, platformConfig, dir);

        const platformModuleId = moduleId.split("/").slice(1);
        const targetPath = foundationRepo.resolvePlatformPath(
          platformConfig,
          ...platformModuleId,
        );

        // todo: clarify definition of kitModuleId and ComplianceControlId - do they include kit/compliance prefix respectively?
        // must handle this consistently across all objects!
        const kitModulePath = collie.relativePath(
          collie.resolvePath("kit", moduleId),
        );
        const platformModuleDir: Dir = {
          name: targetPath,
          entries: [
            {
              name: "terragrunt.hcl",
              content: generateTerragrunt(kitModulePath),
            },
          ],
        };

        await dir.write(platformModuleDir, "");

        logger.progress(
          `applied module ${kitModulePath} to ${
            collie.relativePath(
              targetPath,
            )
          }`,
        );
        logger.tip(
          "edit the terragrunt configuration invoking the kit module at " +
            collie.relativePath(path.join(targetPath, "terragrunt.hcl")),
        );
      },
    );
}

function generatePlatformConfiguration(
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

function generateTerragrunt(kitModulePath: string) {
  const isBootstrap = kitModulePath.endsWith("/bootstrap");

  const platformIncludeBlock = `include "platform" {
  path = find_in_parent_folders("platform.hcl")
}`;

  const moduleIncludeBlock = `include module" {
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
  source = "\${get_repo_root()}//${kitModulePath}"
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

async function selectModule(moduleRepo: KitModuleRepository) {
  const options = moduleRepo.all.map((x) => ({
    value: x.id,
    name: `${x.kitModule.name} ${colors.dim(x.id)}`,
  }));

  return await Select.prompt({
    message: "Select a kit module from your repository",
    options,
    info: true,
    search: true,
  });
}
