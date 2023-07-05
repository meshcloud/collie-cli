import * as path from "std/path";

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
import { TopLevelCommand } from "../TopLevelCommand.ts";
import {
  generatePlatformConfiguration,
  generateTerragrunt,
} from "./kit-utilities.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";

interface ApplyOptions {
  foundation?: string;
  platform?: string;
}
export function registerApplyCmd(program: TopLevelCommand) {
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
      async (opts: GlobalCommandOptions & ApplyOptions, moduleId?: string) => {
        const collie = new CollieRepository("./");
        const logger = new Logger(collie, opts);
        const validator = new ModelValidator(logger);

        const moduleRepo = await KitModuleRepository.load(
          collie,
          validator,
          logger,
        );

        moduleId = moduleId ||
          (await InteractivePrompts.selectModule(moduleRepo));
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

        // tbd: should this come from a bootstrap module?
        generatePlatformConfiguration(foundationRepo, platformConfig, dir);

        const platformModuleId = moduleId.split("/").slice(1);
        const targetPath = foundationRepo.resolvePlatformPath(
          platformConfig,
          ...platformModuleId,
        );

        const factory = new CliApiFacadeFactory(collie, logger);
        const tfDocs = factory.buildTerraformDocs();

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
              content: await generateTerragrunt(kitModulePath, tfDocs),
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
