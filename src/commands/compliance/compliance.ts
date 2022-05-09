import { Command } from "../../deps.ts";
import { registerNewCmd } from "./new.ts";
import { registerTreeCmd } from "./tree.ts";

export function registerComplianceCommand(program: Command) {
  const complianceCommands = new Command();
  registerTreeCmd(complianceCommands);
  registerNewCmd(complianceCommands);

  program
    .command("compliance", complianceCommands)
    .description(
      "Manage compliance frameworks and audit their implementation in your cloud foundation",
    )
    .action(complianceCommands.showHelp);
}
