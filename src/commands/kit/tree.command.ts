import { jsonTree } from "x/json_tree";

import { Command, EnumType } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { KitModuleTreeBuilder } from "../../kit/KitModuleTreeBuilder.ts";
import {
  FoundationDependencies,
  KitDependencyAnalyzer,
} from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import {
  FoundationDependenciesTreeBuilder,
  FoundationsTree,
} from "../../foundation/FoundationDependenciesTreeBuilder.ts";

enum TreeView {
  Kit = "kit",
  Foundation = "foundation",
}

interface TreeOptions {
  view: TreeView;
}

export function registerTreeCmd(program: Command) {
  program
    .command("tree")
    .type("view", new EnumType(TreeView))
    .description("show the kit module tree")
    .option("--view [view:view]", "select the primary dimension of the tree", {
      default: "kit",
    })
    .action(async (opts: GlobalCommandOptions & TreeOptions) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      const analyzeResults = await analyze(collie, logger);

      if (analyzeResults.modules) {
        logger.warn("no kit modules found");
        logger.tipCommand(
          `To define a new kit module run`,
          `kit new "mymodule"`,
        );
        return;
      }

      switch (opts.view) {
        case TreeView.Foundation:
          renderFoundationTree(analyzeResults);
          break;
        case TreeView.Kit:
          renderKitTree(analyzeResults);
      }
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

function renderKitTree(analyzeResults: AnalyzeResults) {
  const { modules, dependencies } = analyzeResults;

  const builder = new KitModuleTreeBuilder(modules);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}

interface AnalyzeResults {
  modules: KitModuleRepository;
  dependencies: {
    foundation: FoundationRepository;
    results: FoundationDependencies;
  }[];
}

async function analyze(
  collie: CollieRepository,
  logger: Logger,
): Promise<AnalyzeResults> {
  const validator = new ModelValidator(logger);

  const modules = await KitModuleRepository.load(collie, validator, logger);
  const foundations = await collie.listFoundations();

  const tasks = foundations.map(async (f) => {
    const foundation = await FoundationRepository.load(collie, f, validator);
    const analyzer = new KitDependencyAnalyzer(collie, modules, logger);

    return {
      foundation,
      results: await analyzer.findKitModuleDependencies(foundation),
    };
  });

  const dependencies = await Promise.all(tasks);

  return { modules, dependencies };
}
