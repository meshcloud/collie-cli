import { Command } from "../../deps.ts";
import { registerListCommand } from "./list.command.ts";

export function registerUserCommand(program: Command) {
  const userCmd = new Command()
    .description(
      `Work with cloud users (AWS IAM Users, AAD Users, Google Cloud Identity Users)`,
    )
    .action(() => {
      userCmd.showHelp();
    });

  registerListCommand(userCmd);

  program.command("user", userCmd);
}
