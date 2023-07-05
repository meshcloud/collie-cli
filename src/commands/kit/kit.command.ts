import { makeTopLevelCommand, TopLevelCommand } from "../TopLevelCommand.ts";
import { registerApplyCmd } from "./apply.command.ts";
import { registerBundledKitCmd } from "./bundle.command.ts";
import { registerCompileCmd } from "./compile.command.ts";
import { registerImportCmd } from "./import.command.ts";
import { registerNewCmd } from "./new.command.ts";
import { registerTreeCmd } from "./tree.command.ts";

export function registerKitCommand(program: TopLevelCommand) {
  const kitCommands = makeTopLevelCommand();
  registerNewCmd(kitCommands);
  registerApplyCmd(kitCommands);
  registerImportCmd(kitCommands);
  registerTreeCmd(kitCommands);
  registerBundledKitCmd(kitCommands);
  registerCompileCmd(kitCommands);

  program
    .command("kit", kitCommands)
    .description(
      "Manage a kit of reusable terraform modules to build landing zones in your cloud platforms",
    )
    .action(() => kitCommands.showHelp());
}
