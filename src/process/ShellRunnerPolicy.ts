import { isWindows } from "../os.ts";

export class ShellRunnerPolicy {
  static shellCommands(commands: string[]) {
    // on windows, we need run through the user's shell as otherwise we have to run e.g. az.exe instead of az
    if (isWindows) {
      return ["cmd.exe", "/c", ...commands];
    }

    // on unix, don't run through the user's shell as that will incur cost of running shell setup (e.g. .bashrc)
    // for every new process that we spawn, and collie typcially spawns many
    return commands;
  }
}
