import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand, makeTopLevelCommand } from "../TopLevelCommand.ts";

const CONFIG_FILE_PATH = ".collie/config.json";

export function registerSetCmd(program: TopLevelCommand) {
  program
    .command("set <property> <value>")
    .description("Set a collie CLI property.")
    .action((_opts: GlobalCommandOptions, property: string, value: string) => {
      // this replaces the file as a whole (unsetting all other options)
      //TODO  read file and replace value
      //TODO check if property is valid
      //TODO auto-complete foundation
    })
} 