import { TopLevelCommand, makeTopLevelCommand } from "../TopLevelCommand.ts";
import { registerSetCmd } from "./set.command.ts";
import { CLI } from "../../info.ts";

export function registerConfigCommand(program: TopLevelCommand) {
  const configCommand = makeTopLevelCommand();
  registerSetCmd(configCommand);

  program
    .command("config", configCommand)
    .description(
      "View and edit collie repository config."
  )
    .example(
      "Set foundation `myfoundation-dev` in repository config.",
      `${CLI} config set foundation myfoundation-dev`,
    )
    .action(() => configCommand.showHelp());
}