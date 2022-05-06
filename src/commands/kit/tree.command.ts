import { jsonTree } from "x/json_tree";
import { Command, EnumType } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import {
  FoundationsTree,
  FoundationTreeBuilder,
} from "../../kit/FoundationTreeBuilder.ts";
import { KitModuleTreeBuilder } from "../../kit/KitModuleTreeBuilder.ts";
import { KitDependencyAnalyzer } from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";

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
    .action(async (opts: CmdGlobalOptions & TreeOptions) => {
      const kit = new CollieRepository("./");
      const logger = new Logger(kit, opts);

      await renderTree(logger, opts.view);
    });
}

async function renderTree(logger: Logger, view: TreeView) {
  switch (view) {
    case TreeView.Foundation:
      await renderFoundationTree(logger);
      break;
    case TreeView.Kit:
      await renderKitTree(logger);
  }
}

async function analyze(logger: Logger) {
  const kit = new CollieRepository("./");
  const validator = new ModelValidator(logger);

  const modules = await KitModuleRepository.load(kit, validator, logger);
  const foundations = await kit.listFoundations();

  const tasks = foundations.map(async (f) => {
    const foundation = await FoundationRepository.load(kit, f, validator);
    const analyzer = new KitDependencyAnalyzer(kit, modules, logger);

    return {
      foundation,
      results: await analyzer.findKitModuleDependencies(foundation),
    };
  });

  const dependencies = await Promise.all(tasks);

  return { modules, dependencies };
}

async function renderFoundationTree(logger: Logger) {
  const { dependencies } = await analyze(logger);

  const foundations: FoundationsTree = {};
  dependencies.forEach(({ foundation, results }) => {
    const builder = new FoundationTreeBuilder(foundation);
    const tree = builder.build(results, { useColors: true });
    Object.assign(foundations, tree);
  });

  const renderedTree = jsonTree({ foundations: foundations }, true);
  console.log(renderedTree);
}

async function renderKitTree(logger: Logger) {
  const { modules, dependencies } = await analyze(logger);

  const builder = new KitModuleTreeBuilder(modules);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
