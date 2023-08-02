import { makeTopLevelCommand, TopLevelCommand } from "../TopLevelCommand.ts";
import { registerSetCmd } from "./set.command.ts";
import { registerGetCmd } from "./get.command.ts";

export function registerConfigCommand(program: TopLevelCommand) {
  const configCommand = makeTopLevelCommand();
  registerSetCmd(configCommand);
  registerGetCmd(configCommand);

  program
    .command("config", configCommand)
    .description(
      "View and edit collie repository config.",
    )
    .action(() => configCommand.showHelp());
}
