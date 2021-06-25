import { Command, open } from "../deps.ts";
import { CLIName, GitHubUrl } from "../config/config.model.ts";

export function registerFeedbackCommand(program: Command) {
  const feedbackCmd = new Command()
    .description(
      `Open the ${CLIName} CLI feedback board in GitHub Discussions.`,
    )
    .action(openFeedback);
  program.command("feedback", feedbackCmd);
}

async function openFeedback() {
  await open(`${GitHubUrl}/discussions`);
}
