import { Command } from "/deps.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";

export function registerListCmd(program: Command) {
  program
    .command("list")
    .description("list existing cloud foundations")
    .action(async (opts: CmdGlobalOptions) => {
      const repo = await CollieRepository.load("./");

      const foundations = await repo.listFoundations();

      // tbd: different output formats?
      if (foundations.length) {
        console.log(foundations.join("\n"));
      } else {
        console.error(
          `no foundations found. Generate a new foundation using\n\tcollie foundation new`,
        );
      }
    });
}
