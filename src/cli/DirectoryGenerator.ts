import * as fs from "std/fs";
import * as path from "std/path";

import { Logger } from "./Logger.ts";

export interface Dir {
  name: string;
  entries: (File | Dir)[];
}

export interface File {
  name: string;
  content: string;
}

function isFile(x: File | Dir): x is File {
  return (x as File).content !== undefined;
}

function isDir(x: File | Dir): x is Dir {
  return !isFile(x);
}

export enum WriteMode {
  overwrite,
  skip,
}

export class DirectoryGenerator {
  constructor(
    private readonly mode: WriteMode,
    private readonly logger: Logger,
  ) {}

  /**
   * Writes a directory tree to the filesystem. beginning at the specified path.
   * Note: maybe consider using Promise.all for speed
   *
   * @param currentDir
   * @param basePath optonal, when currentDir.name is an absolute path or you want to write relative to CWD
   */
  public async write(currentDir: Dir, basePath = "") {
    const currentPath = path.join(basePath, currentDir.name);

    // ensure dir exists, mkdir -p
    this.logger.verbose((fmt) => "writing " + fmt.kitPath(currentPath));
    await Deno.mkdir(currentPath, { recursive: true });

    const files = currentDir.entries.filter(isFile);
    for await (const file of files) {
      const fp = path.join(currentPath, file.name);

      await this.writeFile(fp, file);
    }

    const dirs = currentDir.entries.filter(isDir);
    for await (const dir of dirs) {
      await this.write(dir, currentPath); // recurse
    }
  }

  private async writeFile(filePath: string, file: File) {
    switch (this.mode) {
      // deno-lint-ignore no-fallthrough
      case WriteMode.skip:
        if (await fs.exists(filePath)) {
          this.logger.verbose(
            (fmt) => "skipping existing " + fmt.kitPath(filePath),
          );
          break;
        }
      case WriteMode.overwrite:
        this.logger.verbose((fmt) => "writing " + fmt.kitPath(filePath));
        await Deno.writeTextFile(filePath, file.content);
        break;
    }
  }
}
