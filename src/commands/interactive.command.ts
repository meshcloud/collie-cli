import { Command } from "../deps.ts";
import { startInteractiveMode } from "./interactive/start-interactive-mode.ts";

export function registerInteractiveCommand(program: Command) {
  const interactiveCmd = new Command()
    .description(
      `Starts the interactive Mode.`,
    )
    .action(startInteractiveMode);
  program.command("interactive", interactiveCmd);
}
