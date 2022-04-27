import { Command } from "../../deps.ts";
import { registerListCmd } from "./list.command.ts";
import { registerNewCmd } from "./new.command.ts";

export function registerFoundationCmd(program: Command) {
  const foundationCommands = new Command();
  registerNewCmd(foundationCommands);
  registerListCmd(foundationCommands);

  program
    .command("foundation", foundationCommands)
    .description("Manage your cloud foundations.")
    .action(foundationCommands.showHelp);
}
