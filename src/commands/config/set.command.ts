import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand, makeTopLevelCommand } from "../TopLevelCommand.ts";

const CONFIG_FILE_PATH = ".collie/config.json";

export function registerSetCmd(program: TopLevelCommand) {
  program
    .command("set-foundation <foundation:foundation>")
    .description("Set the foundation config property.")
    .action((_opts: GlobalCommandOptions, foundation: string) => {
      // this replaces the file as a whole (unsetting all other options)
      //TODO  read file and replace value
      Deno.writeTextFile(CONFIG_FILE_PATH, JSON.stringify({ "foundation": foundation })); 
    })
} 