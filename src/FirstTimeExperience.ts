import { printTip } from "./cli/Logger.ts";
import { CollieRepository } from "./model/CollieRepository.ts";

export class FirstTimeExperience {
  static async tryShowTips() {
    const collie = await CollieRepository.load();

    const foundations = await collie.listFoundations();
    if (!foundations.length) {
      printTip(
        "Looks like collie has no ☁️ to herd here - run 'collie init' to set up a new collie repository",
      );
    }
  }
}
