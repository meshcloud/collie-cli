import { Command } from "../../deps.ts";
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

interface ApplyOptions {
  foundation?: string;
  platform?: string;
}
export function registerApplyCmd(program: Command) {
  program
    .command("apply <module>")
    .option("-f, --foundation <foundation:string>", "foundation")
    .option("-p, --platform <platform:string>", "platform", {
      depends: ["foundation"],
    })
    .description("apply an existing cloud foundation kit module to a platform")
    .action(
      async (opts: GlobalCommandOptions & ApplyOptions, moduleId: string) => {
        // todo: should we validate the module?

        const kit = new CollieRepository("./");
        const logger = new Logger(kit, opts);
        const validator = new ModelValidator(logger);

        const foundation = opts.foundation ||
          (await InteractivePrompts.selectFoundation(kit));

        const repo = await FoundationRepository.load(
          kit,
          foundation,
          validator,
        );

        const platform = opts.platform ||
          (await InteractivePrompts.selectPlatform(repo));

        // by convention, the module id looks like $platform/...
        const platformModuleId = moduleId.split("/").slice(1);

        const platformConfig = repo.findPlatform(platform);
        const targetPath = repo.resolvePlatformPath(
          platformConfig,
          ...platformModuleId,
        );
        console.log(targetPath);

        const dir = new DirectoryGenerator(WriteMode.skip, logger);

        const kitModulePath = kit.relativePath(
          kit.resolvePath("kit", moduleId),
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
          `applied module ${kitModulePath} to ${kit.relativePath(targetPath)}`,
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
