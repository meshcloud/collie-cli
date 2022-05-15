import { Logger, printTip } from "./cli/Logger.ts";
import { CollieRepository } from "./model/CollieRepository.ts";

export class FirstTimeExperience {
  static async tryShowTips() {
    const collie = new CollieRepository("./");

    const foundations = await collie.listFoundations();
    if (!foundations.length) {
      printTip(
        "Looks like collie has no ☁️ to herd here - run 'collie foundation new' to set up your clouds",
      );
    }
  }
}
