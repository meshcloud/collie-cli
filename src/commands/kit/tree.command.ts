import { jsonTree } from "x/json_tree";

import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { KitModuleTreeBuilder } from "../../kit/KitModuleTreeBuilder.ts";
import {
  AnalyzeResults,
  prepareAnalyzeCommand,
} from "../prepareAnalyzeCommand.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";

export function registerTreeCmd(program: TopLevelCommand) {
  program
    .command("tree")
    .description("Show kit modules their dependent platform modules")
    .action(async (opts: GlobalCommandOptions) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const analyzeResults = await prepareAnalyzeCommand(collie, logger);

      if (!analyzeResults.modules.all.length) {
        logger.warn("no kit modules found");
        logger.tipCommand(
          `To define a new kit module run`,
          `kit new "my-module"`,
        );
        return;
      }

      const hasAppliedModules = analyzeResults.dependencies.some((d) =>
        d.results.platforms.some((p) => p.modules.length)
      );

      if (!hasAppliedModules) {
        logger.warn("no kit modules applied to any platform");
        logger.tipCommand(`To apply a kit module run`, `kit apply "my-module"`);
      }

      renderKitTree(collie, analyzeResults);
    });
}

function renderKitTree(
  collie: CollieRepository,
  analyzeResults: AnalyzeResults,
) {
  const { modules, dependencies } = analyzeResults;

  const builder = new KitModuleTreeBuilder(collie, modules);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
