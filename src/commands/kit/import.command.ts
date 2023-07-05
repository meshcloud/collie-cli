import * as fs from "std/fs";
import * as path from "std/path";

import { GitCliFacade } from "../../api/git/GitCliFacade.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";

interface ImportOptions {
  clean?: boolean;
  force?: boolean;
}

export function registerImportCmd(program: TopLevelCommand) {
  program
    .command("import <id>")
    .option(
      "--force",
      "overwrite existing kit module files in the local collie repository",
    )
    .option(
      "--clean",
      "clean the local cache of kit modules from the hub before importing instead of just refreshing it",
    )
    .description(
      "Import a published kit module from the official Landing Zone Construction Kit hub at https://github.com/meshcloud/landing-zone-construction-kit",
    )
    .action(async (opts: GlobalCommandOptions & ImportOptions, id: string) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const factory = new CliApiFacadeFactory(collie, logger);
      const git = factory.buildGit();

      const hub = new KitModuleHub(git, collie);

      if (opts.clean) {
        logger.progress("cleaning local cache of hub modules");
        await hub.cleanHubClone();
      }
      logger.progress("updating local cache of hub modules from " + hub.url);

      const dstPath = collie.resolvePath("kit", id);
      try {
        await hub.import(id, dstPath, opts.force);
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

export class KitModuleHub {
  constructor(
    private readonly git: GitCliFacade,
    private readonly repo: CollieRepository,
  ) {}
  private readonly hubCacheDirPath = [".collie", "hub"];

  readonly url =
    "https://github.com/meshcloud/landing-zone-construction-kit.git";

  // IDEA: should we add a prompt for module id? we can parse modules from LZCK repo...
  public async import(id: string, moduleDestDir: string, overwrite?: boolean) {
    const hubDir = await this.updateHubClone();

    const moduleSrcDir = path.resolve(hubDir, "kit", id);

    await fs.copy(moduleSrcDir, moduleDestDir, { overwrite: overwrite });
  }

  private async updateHubClone() {
    const hubCacheDir = this.repo.resolvePath(...this.hubCacheDirPath);

    // we do keep a git clone of the repo locally because copying on the local FS is much faster than downloading and
    // extracting a huge tarball
    await fs.ensureDir(hubCacheDir);

    const hubCacheGitDir = this.repo.resolvePath(
      ...this.hubCacheDirPath,
      ".git",
    );
    const hasAlreadyCloned = await this.git.isRepo(hubCacheGitDir);

    if (hasAlreadyCloned) {
      await this.git.pull(hubCacheDir);
    } else {
      await this.git.clone(hubCacheDir, this.url);
    }

    return hubCacheDir;
  }

  public async cleanHubClone() {
    const hubCacheDir = this.repo.resolvePath(...this.hubCacheDirPath);
    await Deno.remove(hubCacheDir, { recursive: true });
  }
}
