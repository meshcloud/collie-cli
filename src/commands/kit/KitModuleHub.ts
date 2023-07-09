import * as fs from "std/fs";
import { GitCliFacade } from "../../api/git/GitCliFacade.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";

export class KitModuleHub {
  constructor(
    private readonly git: GitCliFacade,
    private readonly repo: CollieRepository,
  ) {}
  private readonly hubCacheDirPath = [".collie", "hub"];

  // hardcoding this is ok for now
  readonly url = "https://github.com/meshcloud/collie-hub.git";

  public async import(id: string, moduleDestDir: string, overwrite?: boolean) {
    const moduleSrcDir = this.repo.resolvePath(
      ...this.hubCacheDirPath,
      "kit",
      id,
    );

    await fs.copy(moduleSrcDir, moduleDestDir, { overwrite: overwrite });
  }

  async updateHubClone() {
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
