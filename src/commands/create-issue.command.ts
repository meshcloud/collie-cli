import { Command, open } from "../deps.ts";
import { CLI, GitHubUrl } from "../info.ts";
import { TopLevelCommand } from "./TopLevelCommand.ts";

export function registerCreateIssueCommand(program: TopLevelCommand) {
  const createIssueCommand = new Command()
    .description(`Open GitHub to create a new issue for ${CLI}.`)
    .action(openNewIssue);

  program.command("create-issue", createIssueCommand);
}

async function openNewIssue() {
  await open(`${GitHubUrl}/issues/new`);
}
