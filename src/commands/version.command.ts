import * as colors from "std/fmt/colors";

import { CliApiFacadeFactory } from "../api/CliApiFacadeFactory.ts";
import { CliDetectionResult } from "../api/CliDetector.ts";
import { InstallationStatus } from "../api/CliInstallationStatus.ts";
import { Logger } from "../cli/Logger.ts";
import { Command } from "../deps.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { OutputFormat } from "../presentation/output-format.ts";

export function registerVersionCommand(program: Command) {
  program.versionOption(
    "-V, --version",
    "Show the version number for this program.",
    async function (this: Command) {
      console.log("collie %s\n", this.getVersion());

      const kit = new CollieRepository("./");
      const logger = new Logger(kit, {
        debug: false,
        verbose: false,
        output: OutputFormat.TABLE,
      });

      const factory = new CliApiFacadeFactory(logger);

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
