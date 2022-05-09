import { jsonTree } from "x/json_tree";
import { Command, EnumType } from "../../deps.ts";

import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import {
  FoundationsTree,
  FoundationTreeBuilder,
} from "../../foundation/FoundationTreeBuilder.ts";
import { KitDependencyAnalyzer } from "../../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { ComplianceControlTreeBuilder } from "../../compliance/ComplianceControlTreeBuilder.ts";

enum TreeView {
  Control = "control",
  Foundation = "foundation",
}

interface TreeOptions {
  view: TreeView;
}

export function registerTreeCmd(program: Command) {
  program
    .command("tree")
    .type("view", new EnumType(TreeView))
    .description("show the compliance control tree")
    .option("--view [view:view]", "select the primary dimension of the tree", {
      default: "control",
    })
    .action(async (opts: GlobalCommandOptions & TreeOptions) => {
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
    case TreeView.Control:
      await renderControlTree(logger);
  }
}

async function analyze(logger: Logger) {
  const repo = new CollieRepository("./");
  const validator = new ModelValidator(logger);

  const modules = await KitModuleRepository.load(repo, validator, logger);
  const foundations = await repo.listFoundations();

  const tasks = foundations.map(async (f) => {
    const foundation = await FoundationRepository.load(repo, f, validator);
    const analyzer = new KitDependencyAnalyzer(repo, modules, logger);

    return {
      foundation,
      results: await analyzer.findKitModuleDependencies(foundation),
    };
  });

  const dependencies = await Promise.all(tasks);
  const controls = await ComplianceControlRepository.load(
    repo,
    validator,
    logger,
  );

  return { controls, dependencies };
}

async function renderFoundationTree(logger: Logger) {
  // note: this is currently the same as "kit tree --view foundation"
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

async function renderControlTree(logger: Logger) {
  const { controls, dependencies } = await analyze(logger);

  const builder = new ComplianceControlTreeBuilder(controls);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
