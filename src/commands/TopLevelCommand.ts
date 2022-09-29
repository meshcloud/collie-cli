import { Command } from "../deps.ts";
import { FoundationType } from "./FoundationType.ts";
import { PlatformType } from "./PlatformType.ts";

export function makeTopLevelCommand() {
  return new Command()
    .globalType("foundation", new FoundationType())
    .globalType("platform", new PlatformType())
    // todo: cliffy 0.24.2 has a nice group options that we could use here
    .globalOption(
      "--verbose",
      "Enable printing verbose info (command execution and results)",
    )
    .globalOption(
      "--debug",
      "Enable printing debug info (command output, intermediate results)",
    );
}

// cliffy had a breaking change in https://github.com/c4spar/deno-cliffy/releases/tag/v0.23.0
// to make the strict typing API the default - this is not our preferred API on this high-level here
// as the types get in the way, individual commands are free to use strict typings for individual subcommands
export type TopLevelCommand = ReturnType<typeof makeTopLevelCommand>;
