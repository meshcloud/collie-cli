import { StringType } from "x/cliffy/command";

import { CollieRepository } from "../../model/CollieRepository.ts";
import { PlatformModuleType } from "./PlatformModuleType.ts";

export class TestModuleType extends StringType {
  async complete(): Promise<string[]> {
    const repo = await CollieRepository.load();
    const modules = await repo.processFilesGlob(
      "foundations/*/platforms/**/*.test/terragrunt.hcl",
      (file) => PlatformModuleType.parseModuleId(file.path),
      false,
    );

    // I don't know how we could get the foundation name passed to the arg to filter
    // only to the platforms in the already specified foundation
    // the foundation arg seems not passed to the completions command, so there's nothing we can do here

    return modules;
  }
}
