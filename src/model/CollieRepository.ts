import * as fs from "std/fs";
import * as path from "std/path";

export class CollieRepository {
  constructor(private readonly repoDir: string) {}

  /**
   * Resolve a path relative to the kit repository
   */
  resolvePath(...pathSegments: string[]) {
    return path.resolve(this.repoDir, ...pathSegments);
  }

  /** */
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

  static async load(searchDir: string) {
    const absolutePath = path.resolve(searchDir);
    const components = absolutePath.split(path.SEP);

    // find parent directory containing the next best git repository
    while (!(await fs.exists(path.join(...components, ".git")))) {
      components.pop();

      if (!components.length) {
        throw new Error(
          `${absolutePath} nor any of its parent directories seemse to be a collie repository`,
        );
      }
    }

    return new CollieRepository(path.join(...components));
  }
}
