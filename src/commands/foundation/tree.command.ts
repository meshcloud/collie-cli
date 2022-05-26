import { jsonTree } from "x/json_tree";

import { Command } from "../../deps.ts";
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

export function registerTreeCmd(program: Command) {
  program
    .command("tree")
    .description("show the foundation tree with module dependencies")
    .action(async (opts: GlobalCommandOptions) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const analyzeResults = await prepareAnalyzeCommand(collie, logger);
      if (!analyzeResults) {
        return;
      }

      renderFoundationTree(analyzeResults);
    });
}

function renderFoundationTree(analyzeResults: AnalyzeResults) {
  const { dependencies } = analyzeResults;

  const foundations: FoundationsTree = {};
  dependencies.forEach(({ foundation, results }) => {
    const builder = new FoundationDependenciesTreeBuilder(foundation);
    const tree = builder.build(results, { useColors: true });
    Object.assign(foundations, tree);
  });

  const renderedTree = jsonTree({ foundations: foundations }, true);
  console.log(renderedTree);
}
