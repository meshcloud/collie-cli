import { Select } from "../../deps.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";

export class InteractivePrompts {
  static async selectFoundation(kit: CollieRepository) {
    return await Select.prompt({
      message: "Select a foundation",
      options: (await kit.listFoundations()).map((x) => ({
        name: x,
        value: x,
      })),
    });
  }

  static async selectPlatform(repo: FoundationRepository): Promise<string> {
    return await Select.prompt({
      message: "Select a platform",
      options: (
        await repo.platforms
      ).map((x) => ({ name: x.name, value: x.name })),
    });
  }
}
