import { Command } from "../../deps.ts";
import { registerDeployCmd } from "./deploy.command.ts";
import { registerListCmd } from "./list.command.ts";
import { registerNewCmd } from "./new.command.ts";

export function registerFoundationCommand(program: Command) {
  const foundationCommands = new Command();
  registerNewCmd(foundationCommands);
  registerListCmd(foundationCommands);
  registerDeployCmd(foundationCommands);

  program
    .command("foundation", foundationCommands)
    .description("Manage your cloud foundations.")
    .action(foundationCommands.showHelp);
}
