import { registerDeployCmd } from "./deploy.command.ts";
import { registerTestCmd } from "./test.command.ts";
import { registerConfigCmd } from "./config.command.ts";
import { registerNewCmd } from "./new.command.ts";
import { registerTreeCmd } from "./tree.command.ts";
import { registerDocsCmd } from "./docs.command.ts";
import { makeTopLevelCommand, TopLevelCommand } from "../TopLevelCommand.ts";

export function registerFoundationCommand(program: TopLevelCommand) {
  const foundationCommands = makeTopLevelCommand();
  registerNewCmd(foundationCommands);
  registerConfigCmd(foundationCommands);
  registerTreeCmd(foundationCommands);
  registerDeployCmd(foundationCommands);
  registerTestCmd(foundationCommands);
  registerDocsCmd(foundationCommands);

  program
    .command("foundation", foundationCommands)
    .description(
      "Create, list and deploy cloud foundations covering all your cloud platforms",
    )
    .action(() => foundationCommands.showHelp());
}
