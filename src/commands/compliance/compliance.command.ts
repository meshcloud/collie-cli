import { makeTopLevelCommand, TopLevelCommand } from "../TopLevelCommand.ts";
import { registerImportCmd } from "./import.command.ts";
import { registerNewCmd } from "./new.command.ts";
import { registerTreeCmd } from "./tree.command.ts";

export function registerComplianceCommand(program: TopLevelCommand) {
  const complianceCommands = makeTopLevelCommand();

  registerTreeCmd(complianceCommands);
  registerNewCmd(complianceCommands);
  registerImportCmd(complianceCommands);

  program
    .command("compliance", complianceCommands)
    .description(
      "Manage compliance frameworks and audit their implementation in your cloud foundation",
    )
    .action(() => complianceCommands.showHelp());
}
