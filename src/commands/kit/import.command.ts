import * as fs from "std/fs";
import * as path from "std/path";

import { GitCliFacade } from "../../api/git/GitCliFacade.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { TransparentProcessRunner } from "../../process/TransparentProcessRunner.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";

export function registerImportCmd(program: TopLevelCommand) {
  program
    .command("import <id>")
    .description(
      "Import a published kit module from the official Landing Zone Construction Kit hub at https://github.com/meshcloud/landing-zone-construction-kit",
    )
    .action(async (opts: GlobalCommandOptions, id: string) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const git = new GitCliFacade(new TransparentProcessRunner());
      const hub = new KitModuleHub(git, collie);

      const validator = new ModelValidator(logger);
      const modules = await KitModuleRepository.load(collie, validator, logger);

      logger.progress(
        "updating local cache of hub modules from " +
          hub.url,
      );

      await hub.import(id, modules.resolvePath(id));

      logger.progress(
        "imported kit module at " +
          collie.relativePath(modules.resolvePath(id, "README.md")),
      );

      logger.tip(
        "customize the terraform code in this kit module at " +
          collie.relativePath(modules.resolvePath(id, "main.tf")),
      );
    });
}

export class KitModuleHub {
  constructor(
    private readonly git: GitCliFacade,
    private readonly repo: CollieRepository,
  ) {}

  readonly url =
    "https://github.com/meshcloud/landing-zone-construction-kit.git";

  // TODO: handle case that module does not exist, handle case that local kit module already exists and would be clobbered
  // IDEA: should we add a prompt for module id? we can parse modules from LZCK repo...
  public async import(id: string, moduleDestDir: string) {
    const hubDir = await this.updateHubClone();

    const moduleSrcDir = path.resolve(hubDir, "kit", id);

    await fs.copy(moduleSrcDir, moduleDestDir);
  }

  // TODO: error handling
  private async updateHubClone() {
    const dstDir = this.repo.resolvePath(".collie", "lzck");

    // we do keep a git clone of the repo locally because copying on the local FS is much faster than downloading and
    // extracting a huge tarball
    await fs.ensureDir(dstDir);

    const repoDir = this.repo.resolvePath(".collie", "lzck", ".git");
    const hasAlreadyCloned = await fs.exists(repoDir);

    if (hasAlreadyCloned) {
      await this.git.pull(dstDir);
    } else {
      await this.git.clone(dstDir, this.url);
    }

    return dstDir;
  }
}
