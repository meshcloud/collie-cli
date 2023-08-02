import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { CLI } from "../../info.ts";

export function registerSetCmd(program: TopLevelCommand) {
  program
    .command("set-foundation [foundation:foundation]")
    .description("Set the foundation config property.")
    .example(
      "Set foundation `myfoundation` in repository config",
      `${CLI} config set-foundation myfoundation`,
    )
    .action(
      async (opts: GlobalCommandOptions, foundationArg: string | undefined) => {
        const repo = await CollieRepository.load();
        const logger = new Logger(repo, opts);
        const foundation = foundationArg ||
          (await InteractivePrompts.selectFoundation(repo, logger));

        const config = new CollieConfig(repo, logger);
        config.setProperty("foundation", foundation);
      },
    );
}
