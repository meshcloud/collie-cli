import * as path from "std/path";

import { Command, GithubProvider, UpgradeCommand } from "../deps.ts";
import { FLAGS, GITHUB_REPO, VERSION } from "../info.ts";

const flagsWithImportMap = FLAGS +
  ` --import-map=https://raw.githubusercontent.com/${GITHUB_REPO}/v${VERSION}/src/import_map.json`;

export function registerUpgradeCommand(program: Command) {
  const denoExecutable = Deno.execPath();
  const isRuntime = path.basename(denoExecutable) === "deno"; // simple and stupid, but avoids recursively invoking ourselves!

  if (!isRuntime) {
    const msg =
      `Upgrade is only supported when collie cli was installed via "deno install".`;
    program
      .command("upgrade")
      .description(msg)
      .action(() => {
        console.error(
          msg +
            `\nThis version at ${denoExecutable} appears to be a self-contained binary.\n` +
            `\nTry installing via:\n` +
            `\n\tdeno install ${flagsWithImportMap} https://raw.githubusercontent.com/${GITHUB_REPO}/v${VERSION}/src/main.ts`,
        );
        Deno.exit(1);
      });
  } else {
    program.command(
      "upgrade",
      new UpgradeCommand({
        args: flagsWithImportMap.split(" "),
        provider: [
          new GithubProvider({ repository: GITHUB_REPO }),
        ],
      }),
    );
  }
}
