import { readerFromStreamReader, copy} from "std/streams/conversion";
import * as path from "std/path";
import { gunzipFile, tar } from "x/compress";
import { Untar } from "std/archive/tar";
import { cryptoRandomString } from "x/crypto_random_string";
import { MeshError } from "../../errors.ts";
import { Dir, DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";

export async function kitDownload(modulePath: string, url: string, repoPath: string | null, logger: Logger) {
  if (url === "") {
    return
  }

  // remove leading '/'s
  while (repoPath != null && repoPath.charAt(0) === '/' && repoPath.length > 0) {
    repoPath = repoPath.substring(1);
  }

  // FIXME with the new dir name look-ahead this becomes obsolete
  //       and we can get rid of the crypto dependency again
  const tarGzipTmpFilepath = await downloadToTemporaryFile(url);
  const rndStr = cryptoRandomString({length: 16});
  const containerDir = path.join(modulePath, rndStr);
  const dirGenerator = new DirectoryGenerator(WriteMode.skip, logger);
  const dir: Dir = {
    name: containerDir,
    entries: [],
  };
  await dirGenerator.write(dir, "");
  const tarTmpFilepath = Deno.makeTempFileSync();
  await gunzipFile(tarGzipTmpFilepath, tarTmpFilepath);
  await tar.uncompress(tarTmpFilepath, containerDir);
  const topLevelDir = await topLevelDirectory(tarTmpFilepath);
  const fullContainerPath = path.join(containerDir, topLevelDir);
  Deno.removeSync(tarGzipTmpFilepath);
  Deno.removeSync(tarTmpFilepath);

  // now, move content out of container directory into module path
  if (repoPath === null || repoPath === "") {
    // we need everything, so just take all files iteratively
    for (const dirEntry of Deno.readDirSync(fullContainerPath)) {
      const target = path.join(modulePath, dirEntry.name); // make sure target does not exist. (override)
      Deno.removeSync(target, { recursive: true });
      Deno.renameSync(path.join(fullContainerPath, dirEntry.name), target);
    }
  } else {
    // we step into the repopath step by step and copy only those files within the path
    const paths = repoPath.split('/');
    let subDir = fullContainerPath;
    let i = 0;
    while (i < paths.length) {
      let found = false;
      for (const dirEntry of Deno.readDirSync(subDir)) {
        if (dirEntry.name === paths[i]) {
          found = true;
          // when this is the final part of path, we copy everything within to target
          // otherwise we go deeper
          if (i === paths.length -1) {
            const sourcePath = path.join(subDir, dirEntry.name);
            for (const sourceDirEntry of Deno.readDirSync(sourcePath)) {
              Deno.renameSync(path.join(sourcePath, sourceDirEntry.name), path.join(modulePath, sourceDirEntry.name));
            }            
          } else {
            subDir = path.join(subDir, dirEntry.name);
          }
          i++; // always increase, iff done, we jump out of the while loop like this.
          break; // for loop
        }
      }
      // there is no such path in the sources, so we abort.
      // we should probably throw here, this is clearly a misconfig in the KitBundle config then!
      if(!found) {
        break;
      }
    }
  }

  Deno.removeSync(containerDir, { recursive: true });
}

async function topLevelDirectory(tarFilepath: string): Promise<string> {
  const reader = Deno.openSync(tarFilepath, { read: true });
  let topLevelDirectory: string | null = null;
  try {
    const untar = new Untar(reader);
    for await (const entry of untar) {
      if (entry.type === "directory") {
        // We expect the tar archive to contain all files and directories inside
        // a single, top-level directory.
        topLevelDirectory = path.parse(entry.fileName).base;
        break;
      }
    }
  } finally {
    reader.close();
  }
  if (topLevelDirectory === null) {
    throw new MeshError(`Unexpected content in archive ${tarFilepath}: Expected at least one directory.`);
  } else {
    return topLevelDirectory;
  }
}

async function downloadToTemporaryFile(url: string): Promise<string> {
  const filepath = Deno.makeTempFileSync();
  const response = await fetch(url);
  const streamReader = response.body?.getReader();
  if (streamReader) {
    const reader = readerFromStreamReader(streamReader);
    const file = Deno.openSync(filepath, {create: true, write: true});
    try {
      await copy(reader, file);
    } finally {
      file.close();
    }
    return filepath;
  } else {
    throw new MeshError(`Unable to download ${url}`);
  }
}