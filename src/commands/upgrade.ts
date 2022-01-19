import { Command, GithubProvider, path, UpgradeCommand } from "../deps.ts";
import { FLAGS, GITHUB_REPO, VERSION } from "../config/info.ts";

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
            `\n\tdeno install ${FLAGS} https://raw.githubusercontent.com/${GITHUB_REPO}/v${VERSION}/cli/unipipe/main.ts`,
        );
        Deno.exit(1);
      });
  } else {
    program.command(
      "upgrade",
      new UpgradeCommand({
        args: FLAGS.split(" "),
        provider: [
          new GithubProvider({ repository: GITHUB_REPO }),
        ],
      }),
    );
  }
}
