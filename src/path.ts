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
