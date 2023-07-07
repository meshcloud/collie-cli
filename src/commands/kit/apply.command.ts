import * as path from "std/path";
import * as fs from "std/fs";
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
import { generateTerragrunt } from "./kit-utilities.ts";
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

        const { kitModulePath, targetPath } = await applyKitModule(
          foundationRepo,
          platformConfig.id,
          logger,
          moduleId,
        );

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

export async function applyKitModule(
  foundationRepo: FoundationRepository,
  platform: string,
  logger: Logger,
  moduleId: string,
) {
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const collie = new CollieRepository("./");
  const platformConfig = foundationRepo.findPlatform(platform);

  const platformModuleId = moduleId.split("/").slice(1);
  const targetPath = foundationRepo.resolvePlatformPath(
    platformConfig,
    ...platformModuleId,
  );

  const factory = new CliApiFacadeFactory(collie, logger);
  const tfdocs = factory.buildTerraformDocs();
  const kitModulePath = collie.relativePath(
    collie.resolvePath("kit", moduleId),
  );

  const platformPath = foundationRepo.resolvePlatformPath(platformConfig);
  await tryCopyTemplateFiles(collie, moduleId, platformPath, logger);

  const platformModuleDir: Dir = {
    name: targetPath,
    entries: [
      {
        name: "terragrunt.hcl",
        content: await generateTerragrunt(kitModulePath, tfdocs),
      },
    ],
  };

  await dir.write(platformModuleDir, "");

  return {
    kitModulePath,
    targetPath,
  };
}

/**
 * Try to copy template files supplied by a kit module.
 * Right now the only use case for this is to provide a platform-level terragrunt DRY scaffold
 * from a bootstrap module, so it's a rather naive hardcoded implementation.
 */
async function tryCopyTemplateFiles(
  collie: CollieRepository,
  moduleId: string,
  platformPath: string,
  logger: Logger,
) {
  const platformTemplatePath = collie.resolvePath(
    "kit",
    moduleId,
    "template",
    "platform",
  );

  for await (const f of fs.walk(platformTemplatePath)) {
    // skip the root
    if (f.name === "platform" && f.isDirectory) {
      continue;
    }

    try {
      await fs.copy(f.path, path.join(platformPath, f.name));
    } catch (e) {
      if (e instanceof Deno.errors.AlreadyExists) {
        logger.debug(
          (fmt) =>
            "skip applying template file " +
            fmt.kitPath(f.path) +
            ", destination file already exists",
        );
      } else {
        throw e;
      }
    }
  }
  // try {
  // } catch (e) {
  //   if (e instanceof Deno.errors.NotFound) {
  //     logger.debug(
  //       (fmt) =>
  //         "did not find any platform template files to copy from " +
  //         fmt.kitPath(platformTemplatePath)
  //     );
  //   } else {
  //     throw e;
  //   }
  // }
}
