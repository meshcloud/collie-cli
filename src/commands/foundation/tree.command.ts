import { jsonTree } from "x/json_tree";

import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import {
  FoundationDependenciesTreeBuilder,
  FoundationsTree,
} from "../../foundation/FoundationDependenciesTreeBuilder.ts";
import {
  AnalyzeResults,
  prepareAnalyzeCommand,
} from "../prepareAnalyzeCommand.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";

export function registerTreeCmd(program: TopLevelCommand) {
  program
    .command("tree")
    .description("show the foundation tree with module dependencies")
    .action(async (opts: GlobalCommandOptions) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const analyzeResults = await prepareAnalyzeCommand(collie, logger);

      const foundations = await collie.listFoundations();
      if (!foundations.length) {
        logger.warn("no foundations found");
        logger.tipCommand(
          `To interactively define a new foundation run`,
          `foundation new "my-foundation"`,
        );
        return;
      }

      const hasAppliedModules = analyzeResults.dependencies.some((d) =>
        d.results.platforms.some((p) => p.modules.length)
      );

      if (!hasAppliedModules) {
        logger.warn("no kit modules applied to any platform");
        logger.tipCommand(`To apply a kit module run`, `kit apply "my-module"`);
        return;
      }

      renderFoundationTree(collie, analyzeResults);
    });
}

function renderFoundationTree(
  collie: CollieRepository,
  analyzeResults: AnalyzeResults,
) {
  const { dependencies } = analyzeResults;

  const foundations: FoundationsTree = {};
  dependencies.forEach(({ foundation, results }) => {
    const builder = new FoundationDependenciesTreeBuilder(collie, foundation);
    const tree = builder.build(results);
    Object.assign(foundations, tree);
  });

  const renderedTree = jsonTree({ foundations: foundations }, true);
  console.log(renderedTree);
}
