import { Select } from "x/cliffy/prompt";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
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
      "overwrite existing compliance control files in the local collie repository",
    )
    .option(
      "--clean",
      "clean the local cache of the collie hub before importing instead of just refreshing it",
    )
    .description(
      "Import a published compliance control framework from the official Collie Hub at https://github.com/meshcloud/collie-hub",
    )
    .action(async (opts: GlobalCommandOptions & ImportOptions, id?: string) => {
      const collie = await CollieRepository.load();
      const logger = new Logger(collie, opts);

      const factory = new CliApiFacadeFactory(collie, logger);
      const git = factory.buildGit();

      const hub = new CollieHub(git, collie);

      if (opts.clean) {
        logger.progress("cleaning local cache of collie hub");
        await hub.cleanHubClone();
      }

      logger.progress("updating local cache of collie hub from " + hub.url);
      const hubDir = await hub.updateHubClone();

      id = id || (await promptForComplianceFrameworkId(hubDir));

      const dstPath = collie.resolvePath("compliance", id);
      try {
        await hub.importComplianceFramework(id, dstPath, opts.force);
      } catch (e) {
        if (e instanceof Deno.errors.AlreadyExists) {
          logger.error(
            (fmt) =>
              "Error: A local compliance control framework already exists at " +
              fmt.kitPath(dstPath),
          );

          logger.tip("add --force to overwrite existing files");

          Deno.exit(1);
        }

        throw e;
      }

      logger.progress(
        "imported compliance control framework at " +
          collie.relativePath(
            collie.resolvePath("compliance", id, "README.md"),
          ),
      );
    });
}

async function promptForComplianceFrameworkId(hubRepoDir: string) {
  // note: the hub is a standard collie repository for the most part, so we can just parse it with the same code
  const repo = await CollieRepository.load(hubRepoDir);
  const complianceDir = repo.resolvePath("compliance");

  const dirs = [];
  for await (const dirEntry of Deno.readDir(complianceDir)) {
    if (dirEntry.isDirectory) {
      dirs.push(dirEntry.name);
    }
  }

  return await Select.prompt({
    message: "Select available collie hub compliance control framework",
    options: dirs.map((x) => ({ name: x, value: x })),
  });
}
