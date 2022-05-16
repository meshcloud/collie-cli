import * as colors from "std/fmt/colors";

import { Dir } from "/cli/DirectoryGenerator.ts";
import { Input } from "../deps.ts";
import { PlatformConfig } from "../model/PlatformConfig.ts";

const platformIdRegex = /^[a-z0-9_.-]+$/;

export abstract class PlatformSetup<T extends PlatformConfig> {
  protected progress(message: string) {
    console.log(colors.italic("..." + message));
  }

  protected async promptPlatformName() {
    return await Input.prompt({
      message: "Select a name for this cloud platform",
      hint: "",
      validate: (s) => {
        if (s.match(platformIdRegex)) {
          return true;
        }

        return "only alphanumeric characters, '-', '_' and '.' are allowed";
      },
    });
  }
  abstract promptInteractively(): Promise<T>;
  abstract preparePlatformDir(config: T): Dir;
}
