import { makeTopLevelCommand, TopLevelCommand } from "../TopLevelCommand.ts";
import { registerSetCmd } from "./set.command.ts";

export function registerConfigCommand(program: TopLevelCommand) {
  const configCommand = makeTopLevelCommand();
  registerSetCmd(configCommand);

  program
    .command("config", configCommand)
    .description(
      "View and edit collie repository config.",
    )
    .action(() => configCommand.showHelp());
}
