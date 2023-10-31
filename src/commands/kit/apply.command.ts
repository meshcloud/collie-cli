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
import { getCurrentWorkingFoundation } from "../../cli/commandOptionsConventions.ts";

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
        const collie = await CollieRepository.load();
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

        const foundation = await getCurrentWorkingFoundation(
          opts.foundation,
          logger,
          collie,
        );

        const foundationRepo = await FoundationRepository.load(
          collie,
          foundation,
          validator,
        );

        const platform = opts.platform ||
          (await InteractivePrompts.selectPlatform(foundationRepo));

        // by convention, the module id looks like $platform/...
        const platformConfig = foundationRepo.findPlatform(platform);

        const { relativeKitModulePath, targetPath } = await applyKitModule(
          foundationRepo,
          platformConfig.id,
          logger,
          moduleId,
        );

        logger.progress(
          `applied module ${relativeKitModulePath} to ${
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
  const collie = await CollieRepository.load();
  const platformConfig = foundationRepo.findPlatform(platform);

  const platformModuleId = moduleId.split("/").slice(1);
  const targetPath = foundationRepo.resolvePlatformPath(
    platformConfig,
    ...platformModuleId,
  );

  const factory = new CliApiFacadeFactory(logger);
  const tfdocs = factory.buildTerraformDocs(collie);
  const relativeKitModulePath = collie.relativePath(
    collie.resolvePath("kit", moduleId),
  );

  const platformPath = foundationRepo.resolvePlatformPath(platformConfig);

  await tryCopyTemplateFiles(
    collie,
    moduleId,
    "platform",
    platformPath,
    logger,
  );
  await tryCopyTemplateFiles(
    collie,
    moduleId,
    "platform-module",
    targetPath,
    logger,
  );

  // just try generating a terragrunt.hcl, it will not overwrite one that was explicitly provided by a template
  const platformModuleDir: Dir = {
    name: targetPath,
    entries: [
      {
        name: "terragrunt.hcl",
        content: await generateTerragrunt(relativeKitModulePath, tfdocs),
      },
    ],
  };

  await dir.write(platformModuleDir);

  return {
    relativeKitModulePath,
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
  templateId: string,
  destinationDir: string,
  logger: Logger,
) {
  const platformTemplatePath = collie.resolvePath(
    "kit",
    moduleId,
    "template",
    templateId,
  );

  // TODO: have not tested nested structures etc., not a concern right now
  try {
    for await (const f of fs.walk(platformTemplatePath)) {
      // the first walk entry is always the root of the walk, skip it
      if (f.name === templateId && f.isDirectory) {
        continue;
      }

      await tryCopyTemplateFileEntry(destinationDir, f, logger);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      logger.verbose(
        (fmt) =>
          `skip applying template files as kit module has no templates at ${
            fmt.kitPath(
              platformTemplatePath,
            )
          }`,
      );
    } else {
      throw e;
    }
  }
}

async function tryCopyTemplateFileEntry(
  destinationDir: string,
  file: fs.WalkEntry,
  logger: Logger,
) {
  const destinationPath = path.join(destinationDir, file.name);
  try {
    await fs.ensureDir(destinationDir);
    await fs.copy(file.path, destinationPath);
    logger.verbose(
      (fmt) =>
        `applied template file ${fmt.kitPath(file.path)} to ${
          fmt.kitPath(
            destinationPath,
          )
        }`,
    );
  } catch (e) {
    if (e instanceof Deno.errors.AlreadyExists) {
      logger.verbose(
        (fmt) =>
          `skip applying template file ${
            fmt.kitPath(
              file.path,
            )
          }, destination file ${fmt.kitPath(destinationPath)} already exists`,
      );
    } else {
      throw e;
    }
  }
}
