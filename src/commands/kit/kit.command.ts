import { Command } from "../../deps.ts";
import { registerApplyCmd } from "./apply.command.ts";
import { registerNewCmd } from "./new.command.ts";
import { registerTreeCmd } from "./tree.command.ts";

export function registerKitCommand(program: Command) {
  const kitCommands = new Command();
  registerTreeCmd(kitCommands);
  registerNewCmd(kitCommands);
  registerApplyCmd(kitCommands);

  program
    .command("kit", kitCommands)
    .description("Manage your cloud foundation kit.")
    .action(kitCommands.showHelp);
}
