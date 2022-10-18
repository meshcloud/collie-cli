import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";

export function registerPredefinedCmd(program: TopLevelCommand) {
  program
    .command("predefined <foundation:foundation>")
    .description("generate a predefined cloud foundation")
    .action(async (opts: GlobalCommandOptions, foundation: string) => {
      const repo = await CollieRepository.load();
      const logger = new Logger(repo, opts);

      logger.progress("predefined!");
      // TODO now we can get going here.
    });
}

