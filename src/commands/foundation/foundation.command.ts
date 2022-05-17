import { Command } from "../../deps.ts";
import { registerDeployCmd } from "./deploy.command.ts";
import { registerConfigCmd } from "./config.command.ts";
import { registerNewCmd } from "./new.command.ts";

export function registerFoundationCommand(program: Command) {
  const foundationCommands = new Command();
  registerNewCmd(foundationCommands);
  registerConfigCmd(foundationCommands);
  registerDeployCmd(foundationCommands);

  program
    .command("foundation", foundationCommands)
    .description(
      "Create, list and deploy cloud foundations covering all your cloud platforms",
    )
    .action(foundationCommands.showHelp);
}
