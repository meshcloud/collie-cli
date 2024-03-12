import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import {
  CollieConfig,
  CollieConfigProperties,
} from "../../model/CollieConfig.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CLI } from "../../info.ts";

export function registerGetCmd(program: TopLevelCommand) {
  program
    .command("get <property>")
    .description("Get a config property from the repository config.")
    .example(
      "Get foundation property from repository config",
      `${CLI} config get foundation`,
    )
    .action(
      async (opts: GlobalCommandOptions, property: string) => {
        const repo = await CollieRepository.load();
        const logger = new Logger(repo, opts);
        const config = new CollieConfig(repo, logger);
        const value = config.getProperty(
          property as keyof CollieConfigProperties,
        );
        console.log(value);
      },
    );
}
