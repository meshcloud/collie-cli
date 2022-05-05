import { Command, open } from "../deps.ts";
import { CLI, GitHubUrl } from "../info.ts";

export function registerFeedbackCommand(program: Command) {
  const feedbackCmd = new Command()
    .description(
      `Open the ${CLI} CLI feedback board in GitHub Discussions.`,
    )
    .action(openFeedback);
  program.command("feedback", feedbackCmd);
}

async function openFeedback() {
  await open(`${GitHubUrl}/discussions`);
}
