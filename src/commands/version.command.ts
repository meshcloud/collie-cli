import * as colors from "std/fmt/colors";

import { CliApiFacadeFactory } from "../api/CliApiFacadeFactory.ts";
import { CliDetectionResult } from "../api/CliDetector.ts";
import { InstallationStatus } from "../api/CliInstallationStatus.ts";
import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { TopLevelCommand } from "./TopLevelCommand.ts";

export function registerVersionCommand(program: TopLevelCommand) {
  program.versionOption(
    "-V, --version",
    "Show the version number for this program.",
    async function () {
      console.log("collie %s\n", program.getVersion());

      const collie = new CollieRepository("./");
      const logger = new Logger(collie, {});

      const factory = new CliApiFacadeFactory(collie, logger);

      const detectors = factory.buildCliDetectors();

      const detectTasks = detectors.map((x) => x.detect());
      const infos = await Promise.all(detectTasks);

      const cliInfos = infos.map((x) => formatInfo(x)).join("\n");
      console.log(cliInfos);
    },
  );
}

function formatInfo(r: CliDetectionResult) {
  switch (r.status) {
    case InstallationStatus.NotInstalled:
      return `${r.cli} ${colors.italic("not installed")}`;
    case InstallationStatus.UnsupportedVersion:
      return `${r.cli} ${r.version} ${colors.italic("unsupported version")}`;
    case InstallationStatus.Installed: {
      return `${r.cli} ${r.version}`;
    }
  }
}
