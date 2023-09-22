import * as colors from "std/fmt/colors";

import { CliApiFacadeFactory } from "../api/CliApiFacadeFactory.ts";
import { CliDetectionResult } from "../api/CliDetector.ts";
import { InstallationStatus } from "../api/CliInstallationStatus.ts";
import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { TopLevelCommand } from "./TopLevelCommand.ts";
import { GlobalCommandOptions } from "./GlobalCommandOptions.ts";

export function registerInfoCommand(program: TopLevelCommand) {
  program
    .command("info")
    .description("Show info about this program and the environment")
    .action(async (opts: GlobalCommandOptions) => {
      console.log("collie %s\n", program.getVersion());

      console.log(`Runtime:`);
      console.log(`deno ${Deno.version.deno} ${Deno.build.target}\n`);

      const collie = CollieRepository.uninitialized(".");
      const logger = new Logger(collie, opts);

      const factory = new CliApiFacadeFactory(logger);

      const detectors = factory.buildCliDetectors();

      const detectTasks = detectors.map((x) => x.detect());
      const infos = await Promise.all(detectTasks);

      const cliInfos = infos.map((x) => formatInfo(x)).join("\n");
      console.log("Installed dependencies:");
      console.log(cliInfos);
    });
}

function formatInfo(r: CliDetectionResult) {
  switch (r.status) {
    case InstallationStatus.NotInstalled:
      return `${colors.red("x")} ${r.cli} ${colors.italic("not installed")}`;
    case InstallationStatus.UnsupportedVersion:
      return `${colors.red("x")} ${r.cli} ${r.version} ${
        colors.italic("unsupported version")
      }`;
    case InstallationStatus.Installed: {
      return `${colors.green("✔")} ${r.cli} ${r.version}`;
    }
  }
}
