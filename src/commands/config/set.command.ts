import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CollieConfig } from "../../model/CollieConfig.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { CLI } from "../../info.ts";

export function registerSetCmd(program: TopLevelCommand) {
  program
    .command("set-foundation <foundation:foundation>")
    .description("Set the foundation config property.")
    .example(
      "Set foundation `myfoundation` in repository config.",
      `${CLI} config set-foundation myfoundation`,
    )
    .action(
      async (opts: GlobalCommandOptions, foundationArg: string | undefined) => {
        const collieRepo = await CollieRepository.load();
        const logger = new Logger(collieRepo, opts);
        const foundation = foundationArg ||
          (await InteractivePrompts.selectFoundation(collieRepo, logger));

        CollieConfig.setFoundation(foundation, logger);
      },
    );
}
