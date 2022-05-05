import { Command } from "/deps.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { Logger } from "../../cli/Logger.ts";
import { CLI } from "../../info.ts";

export function registerListCmd(program: Command) {
  program
    .command("list")
    .description("list existing cloud foundations")
    .action(async (opts: CmdGlobalOptions) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundations = await repo.listFoundations();

      // tbd: different output formats?
      if (foundations.length) {
        console.log(foundations.join("\n"));
      } else {
        logger.warn("no foundations found");
        logger.tip(
          `Generate a new foundation using\n\t${CLI} foundation new`,
        );
      }
    });
}
