import * as colors from "std/fmt/colors";

import { Dir } from "/cli/DirectoryGenerator.ts";
import { Input } from "x/cliffy/prompt";
import { PlatformConfig } from "../model/PlatformConfig.ts";

const platformIdRegex = /^[a-z0-9_.-]+$/;

export abstract class PlatformSetup<T extends PlatformConfig> {
  protected progress(message: string) {
    console.log(colors.italic("..." + message));
  }

  protected async promptPlatformName() {
    const id = await Input.prompt({
      message: "Define an id for this cloud platform",
      hint:
        "The id is used in collie commands and the generated foundation repository directory structure ",
      validate: (s) => {
        if (s.match(platformIdRegex)) {
          return true;
        }

        return "only alphanumeric characters, '-', '_' and '.' are allowed";
      },
    });

    const name = await Input.prompt({
      message: "Define a human-readable name for this cloud platform",
      hint: "The human readable name is used in output generated from collie",
      default: id,
    });

    return { id, name };
  }

  abstract promptInteractively(): Promise<T>;
  abstract preparePlatformDir(config: T): Dir;
}
