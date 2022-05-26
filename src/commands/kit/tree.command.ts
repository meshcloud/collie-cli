import { jsonTree } from "x/json_tree";

import { Command } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { KitModuleTreeBuilder } from "../../kit/KitModuleTreeBuilder.ts";
import {
  AnalyzeResults,
  prepareAnalyzeCommand,
} from "../prepareAnalyzeCommand.ts";

export function registerTreeCmd(program: Command) {
  program
    .command("tree")
    .description("show the kit module tree with foundation dependencies")
    .action(async (opts: GlobalCommandOptions) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const analyzeResults = await prepareAnalyzeCommand(collie, logger);
      if (!analyzeResults) {
        return;
      }

      renderKitTree(analyzeResults);
    });
}

function renderKitTree(analyzeResults: AnalyzeResults) {
  const { modules, dependencies } = analyzeResults;

  const builder = new KitModuleTreeBuilder(modules);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
