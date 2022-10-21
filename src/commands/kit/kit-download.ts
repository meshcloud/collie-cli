import { readerFromStreamReader, copy } from "std/streams/conversion";
import * as path from "std/path";
import { gunzipFile } from "x/compress";
import { TarEntry, Untar } from "std/archive/tar";
import { MeshError } from "../../errors.ts";
import { ensureDirSync } from "std/fs/ensure_dir";
import { ensureFileSync } from "std/fs/ensure_file";

export async function kitDownload(modulePath: string, url: string, repoPath: string | undefined) {
  if (url === "") {
    return
  }

  // remove leading '/'s
  repoPath = repoPath?.replace(/^\/+/, '');

  const tarGzipTmpFilepath = await downloadToTemporaryFile(url);
  const tarTmpFilepath = Deno.makeTempFileSync();
  await gunzipFile(tarGzipTmpFilepath, tarTmpFilepath);
  Deno.removeSync(tarGzipTmpFilepath);
  const topLevelDir = await topLevelDirectory(tarTmpFilepath);
  const directoryPrefix = topLevelDir + '/' + (repoPath ?? '')
  await extractTar(tarTmpFilepath, directoryPrefix, modulePath);

  Deno.removeSync(tarTmpFilepath);
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

/**
 * @param tarFilepath The path to the .tar file.
 * @param targetDirectory The directory to extract the files to.
 * @param directoryPrefix A prefix like 'my-directory/foo/bar/', in case only files from the given directory should be extracted.
 *                        Use the empty string to extract everything.
 */
 async function extractTar(tarFilepath: string, directoryPrefix: string, targetDirectory: string) {
  const reader = Deno.openSync(tarFilepath, { read: true });
  const untar = new Untar(reader);

  for await (const entry of untar) {
    if (!subdirectoryOf(entry, directoryPrefix)) {
      continue;
    }
    const filenameWithoutPrefix = removeLeading(entry.fileName, directoryPrefix);
    const targetFilepath = path.join(targetDirectory, filenameWithoutPrefix)

    if (entry.type === "directory") {
      ensureDirSync(targetFilepath);
      continue;
    }

    ensureFileSync(targetFilepath);
    const file = Deno.openSync(targetFilepath, { write: true });
    try {
      await copy(entry, file);
    } finally {
      file.close();
    }
  }
  reader.close();
}

function removeLeading(s: string, prefix: string): string {
  const regexp = new RegExp(`^${prefix}`);
  return s.replace(regexp, '');
}

function subdirectoryOf(tarEntry: TarEntry, directoryPrefix: string): boolean {
  return tarEntry.fileName.length > directoryPrefix.length && tarEntry.fileName.startsWith(directoryPrefix);
}
