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

  // FIXME this is just a placeholder. We need to select only this path from the sources.
  if(repoPath === "foo") {
    console.log("");
  }

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

  // now, move content out of container directory into module path:
  for (const dirEntry of Deno.readDirSync(fullContainerPath)) {
    Deno.renameSync(path.join(fullContainerPath, dirEntry.name), path.join(modulePath, dirEntry.name));
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