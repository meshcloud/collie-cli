import * as fs from "std/fs";
import * as path from "std/path";
import { StringType } from "x/cliffy/command";

export class PlatformModuleType extends StringType {
  async complete(): Promise<string[]> {
    const modules = [];

    for await (
      const file of fs.expandGlob(
        "foundations/*/platforms/*/**/terragrunt.hcl",
        {
          exclude: ["**/.terragrunt-cache"],
          globstar: true,
        },
      )
    ) {
      const id = PlatformModuleType.parseModuleId(file.path);
      modules.push(id);
    }

    // I don't know how we could get the foundation name passed to the arg to filter
    // only to the platforms in the already specified foundation
    // the foundation arg seems not passed to the completions command, so there's nothing we can do here

    return modules;
  }

  static parseModuleId(matchedPath: string) {
    const components = matchedPath.split(path.SEP);
    const platformIndex = components.lastIndexOf("platforms");

    const dropTerragruntHclComponent = -1;
    const skipPlatformNameComponent = 2;

    const moduleId = components.slice(
      platformIndex + skipPlatformNameComponent,
      dropTerragruntHclComponent,
    );

    return path.join(...moduleId);
  }
}
