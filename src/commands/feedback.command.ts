import { Command, open } from "../deps.ts";
import { CLI, GitHubUrl } from "../info.ts";
import { TopLevelCommand } from "./TopLevelCommand.ts";

export function registerFeedbackCommand(program: TopLevelCommand) {
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
