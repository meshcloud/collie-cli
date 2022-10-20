import { readerFromStreamReader, copy} from "std/streams/conversion";
import * as path from "std/path";

import { tgz } from "x/tar";
import { cryptoRandomString } from "x/crypto_random_string";
import { MeshError } from "../../errors.ts";
import { Dir, DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";

export async function kitDownload(modulePath: string, url: string, repoPath: string, logger: Logger) {
  if (url === "") {
    return
  }

  // FIXME
  console.log(repoPath);

  const tmpFilepath = await downloadToTemporaryFile(url);
  const rndStr = cryptoRandomString({length: 16});
  const containerDir = path.join(modulePath, rndStr);
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const d: Dir = {
    name: containerDir,
    entries: [],
  };
  await dir.write(d, "");
  await tgz.uncompress(tmpFilepath, containerDir);
  await Deno.remove(tmpFilepath);

  // now move content out of container directory, into module path:
  for (const containerDirEntry of Deno.readDirSync(containerDir)) {
    if (containerDirEntry.isDirectory) {
      const fullContainerPath = path.join(containerDir, containerDirEntry.name);
      for (const dirEntry of Deno.readDirSync(fullContainerPath)) {
        Deno.renameSync(path.join(fullContainerPath, dirEntry.name), path.join(modulePath, dirEntry.name));
      }
      break;
    }
  }
  Deno.removeSync(containerDir, { recursive: true });
}

async function downloadToTemporaryFile(url: string): Promise<string> {
  const filepath = await Deno.makeTempFile();
  const response = await fetch(url);
  const streamReader = response.body?.getReader();
  if (streamReader) {
    const reader = readerFromStreamReader(streamReader);
    const file = await Deno.open(filepath, {create: true, write: true});
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