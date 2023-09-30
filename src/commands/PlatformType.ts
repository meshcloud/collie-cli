import * as path from "std/path";

import { StringType } from "x/cliffy/command";
import { CollieRepository } from "../model/CollieRepository.ts";

export class PlatformType extends StringType {
  async complete(): Promise<string[]> {
    const repo = await CollieRepository.load();
    const platforms = await repo.processFilesGlob(
      "foundations/*/platforms/*/README.md",
      (file) => path.basename(path.dirname(file.path)),
    );

    // I don't know how we could get the foundation name passed to the arg to filter
    // only to the platforms in the already specified foundation
    // the foundation arg seems not passed to the completions command, so there's nothing we can do here

    return platforms;
  }
}
