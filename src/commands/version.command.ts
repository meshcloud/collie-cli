import { TopLevelCommand } from "./TopLevelCommand.ts";

export function registerVersionCommand(program: TopLevelCommand) {
  program.versionOption(
    "-V, --version",
    "Show the version number for this program.",
    () => {
      console.log("collie %s", program.getVersion());
    },
  );
}
