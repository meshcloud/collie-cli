import * as fs from "std/fs";
import * as path from "std/path";

export class CollieRepository {
  private constructor(private readonly repoDir: string) {
    if (!path.isAbsolute(repoDir)) {
      throw new Error(
        `Tried to load CollieRepository with an invalid path. '${repoDir}' is not an absolute path.`,
      );
    }
  }

  /**
   * Resolve a path relative to the kit repository
   */
  resolvePath(...pathSegments: string[]) {
    return path.resolve(this.repoDir, ...pathSegments);
  }

  /**
   * Calculate a relative path between the repoDir
   * @param toPath an absolute path
   */
  relativePath(toPath: string) {
    return path.relative(this.repoDir, toPath);
  }

  async listFoundations() {
    const foundationsDir = this.resolvePath("foundations");
    const entries = await Deno.readDir(foundationsDir);

    try {
      const foundationDirs: string[] = [];
      for await (const entry of entries) {
        if (entry.isDirectory) {
          foundationDirs.push(path.basename(entry.name));
        }
      }

      return foundationDirs;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return []; // no foiundations dir exists, this is fine
      }

      throw error;
    }
  }

  async processFilesGlob<T>(
    pattern: string,
    process: (file: fs.WalkEntry) => T | undefined,
  ): Promise<T[]> {
    const q: T[] = [];
    for await (
      const file of fs.expandGlob(pattern, {
        root: this.repoDir,
        globstar: true,

        exclude: [
          "README.md", // exclude top-level readme
          "kit/README.md",
          "compliance/README.md",

          "**/.terragrunt-cache", // never scan terraform caches
          "**/.terraform", // exclude terraform dot-files (these can be left in kit/ from e.g. calling terraform validate)
          "kit/**/modules", // exclude sub-modules
          "kit/**/template", // exclude template files
        ],
      })
    ) {
      const task = process(file);
      if (task) {
        q.push(task);
      }
    }

    return q;
  }

  static async load(searchDir = "./"): Promise<CollieRepository> {
    let absolutePath = path.resolve(searchDir);

    // find parent directory containing the next best git repository
    while (!(await fs.exists(path.join(absolutePath, ".git")))) {
      absolutePath = path.dirname(absolutePath);

      const isAtRootOfFilesystem = absolutePath == path.dirname(absolutePath);
      if (isAtRootOfFilesystem) {
        throw new Error(
          `${absolutePath} nor any of its parent directories seems to be a collie repository`,
        );
      }
    }

    return new CollieRepository(absolutePath);
  }

  static uninitialized(dir: string) {
    const absolutePath = path.resolve(dir);

    return new CollieRepository(absolutePath);
  }
}
