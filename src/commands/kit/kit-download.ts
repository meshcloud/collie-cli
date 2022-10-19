import { readerFromStreamReader, copy} from "std/streams/conversion";

import { tgz } from "x/tar";
import { MeshError } from "../../errors.ts";

export async function kitDownload(modulePath: string, url: string) {
  const tmpFilepath = await downloadToTemporaryFile(url);
  // TODO this currently creates an unnecessary directory,
  // like caf-terraform-landingzones-57d67d2640ea8541e639d60fc70de5a3409c8876
  await tgz.uncompress(tmpFilepath, modulePath);
  await Deno.remove(tmpFilepath);
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