import * as path from "std/path";
import * as posix from "std/path/posix";

/**
 * Converts a relative path with windows or POSIX path separators to a relative path with POSIX separators
 * https://stackoverflow.com/questions/53799385/how-can-i-convert-a-windows-path-to-posix-path-using-node-path
 * @param relativePath a relative path (this is important!)
 * @returns
 */
export function convertToPosixPath(relativePath: string) {
  return relativePath.split(path.SEPARATOR).join(posix.SEPARATOR);
}

/**
 * Removes a dir, including all its contents. Does not throw if the dir does not exist.
 * Equivalent to `rm -rf dir`
 *
 * @param dir the directory to remove
 */
export async function rimraf(dir: string) {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // ignore, dir is already removed
    } else {
      throw error;
    }
  }
}
