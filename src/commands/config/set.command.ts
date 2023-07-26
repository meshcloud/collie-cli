import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand, makeTopLevelCommand } from "../TopLevelCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";

export function registerSetCmd(program: TopLevelCommand) {
  program
    .command("set-foundation <foundation:foundation>")
    .description("Set the foundation config property.")
    .action(async (opts: GlobalCommandOptions, foundation: string) => {

      const collieRepo = await CollieRepository.load();
      const logger = new Logger(collieRepo, opts);
      // this replaces the file as a whole (unsetting all other options)
      //TODO  read file and replace value
      Deno.writeTextFile(CollieConfig.CONFIG_FILE_PATH, JSON.stringify({ "foundation": foundation })); 
      logger.progress(`Set foundation to ${foundation}`)
    })
} 