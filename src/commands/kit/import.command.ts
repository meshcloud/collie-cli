import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { CollieHub } from "../../model/CollieHub.ts";

interface ImportOptions {
  clean?: boolean;
  force?: boolean;
}

export function registerImportCmd(program: TopLevelCommand) {
  program
    .command("import [id]")
    .option(
      "--force",
      "overwrite existing kit module files in the local collie repository",
    )
    .option(
      "--clean",
      "clean the local cache of kit modules from the hub before importing instead of just refreshing it",
    )
    .description(
      "Import a published kit module from the official Collie Hub at https://github.com/meshcloud/collie-hub",
    )
    .action(async (opts: GlobalCommandOptions & ImportOptions, id?: string) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const factory = new CliApiFacadeFactory(collie, logger);
      const git = factory.buildGit();

      const hub = new CollieHub(git, collie);

      if (opts.clean) {
        logger.progress("cleaning local cache of hub modules");
        await hub.cleanHubClone();
      }

      logger.progress("updating local cache of hub modules from " + hub.url);
      const hubDir = await hub.updateHubClone();

      id = id || (await promptForKitModuleId(logger, hubDir));

      const dstPath = collie.resolvePath("kit", id);
      try {
        await hub.importKitModule(id, dstPath, opts.force);
      } catch (e) {
        if (e instanceof Deno.errors.AlreadyExists) {
          logger.error(
            (fmt) =>
              "Error: A local kit module already exists at " +
              fmt.kitPath(dstPath),
          );

          logger.tip("add --force to overwrite existing files");

          Deno.exit(1);
        }

        throw e;
      }

      logger.progress(
        "imported kit module at " +
          collie.relativePath(collie.resolvePath("kit", id, "README.md")),
      );

      logger.tip(
        "customize the terraform code in this kit module at " +
          collie.relativePath(collie.resolvePath("kit", id, "main.tf")),
      );
    });
}

async function promptForKitModuleId(logger: Logger, hubRepoDir: string) {
  // note: the hub is a standard collie repository for the most part, so we can just parse it with the same code
  const repo = new CollieRepository(hubRepoDir);
  const validator = new ModelValidator(logger);

  const moduleRepo = await KitModuleRepository.load(repo, validator, logger);

  return await InteractivePrompts.selectModule(
    moduleRepo,
    "official collie hub modules",
  );
}
