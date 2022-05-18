import * as fs from "std/fs";
import * as path from "std/path";

import { StringType } from "../deps.ts";

export class PlatformType extends StringType {
  async complete(): Promise<string[]> {
    const platforms = [];

    for await (
      const file of fs.expandGlob(
        "foundations/*/platforms/*/README.md",
      )
    ) {
      const id = path.basename(path.dirname(file.path));
      platforms.push(id);
    }

    // I don't know how we could get the foundation name passed to the arg to filter
    // only to the platforms in the already specified foundation
    // the foundation arg seems not passed to the completions command, so there's nothing we can do here

    return platforms;
  }
}
