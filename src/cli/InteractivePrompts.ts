import * as colors from "std/fmt/colors";
import { Select } from "x/cliffy/prompt";
import { isWindows } from "../os.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { FoundationRepository } from "../model/FoundationRepository.ts";
import { KitModuleRepository } from "../kit/KitModuleRepository.ts";
import { Logger } from "../cli/Logger.ts";

export class InteractivePrompts {
  static async selectFoundation(kit: CollieRepository, logger: Logger) {
    logger.tipCommand(
      `To set a default foundation run`,
      `config set-foundation <foundation>"`,
    );
    return await Select.prompt({
      message: "Select a foundation",
      options: (
        await kit.listFoundations()
      ).map((x) => ({
        name: x,
        value: x,
      })),
    });
  }

  static async selectPlatform(repo: FoundationRepository): Promise<string> {
    return await Select.prompt({
      message: "Select a platform",
      options: (await repo.platforms).map((x) => ({ name: x.id, value: x.id })),
    });
  }

  static async selectModule(
    moduleRepo: KitModuleRepository,
    fromWhereDescription = "your repository",
  ) {
    const options = moduleRepo.all.map((x) => ({
      value: x.id,
      name: `${x.kitModule.name} ${colors.dim(x.id)}`,
    }));

    return await Select.prompt({
      message: "Select a kit module from " + fromWhereDescription,
      options,
      info: true,
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264
    });
  }
}
