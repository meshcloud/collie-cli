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
    .description("apply an existing cloud foundation kit module to a platform")
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
        const platformModuleId = moduleId.split("/").slice(1);

        const platformConfig = foundationRepo.findPlatform(platform);
        const targetPath = foundationRepo.resolvePlatformPath(
          platformConfig,
          ...platformModuleId,
        );

        const dir = new DirectoryGenerator(WriteMode.skip, logger);

        // todo: clarify definition of kitModuleId and ComplianceControlId - do they include kit/compliance prefix respectively?
        // must handle this consistently across all objects!
        const kitModulePath = collie.relativePath(
          collie.resolvePath("kit", moduleId),
        );
        const d: Dir = {
          name: targetPath,
          entries: [
            {
              name: "terragrunt.hcl",
              content: generateTerragrunt(kitModulePath),
            },
          ],
        };

        await dir.write(d, "");

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

function generateTerragrunt(kitModulePath: string) {
  return `include "root" {
  path = find_in_parent_folders()
}

locals {
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
# todo: define module's required providers
EOF
}

terraform {
  source = "\${get_repo_root()}//${kitModulePath}"
}

inputs = {
  output_md_file = "\${get_terragrunt_dir()}/output.md"
}

  `;
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
