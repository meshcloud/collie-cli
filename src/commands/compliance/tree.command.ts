import { jsonTree } from "x/json_tree";
import { Command, EnumType } from "../../deps.ts";

import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import {
  FoundationDependenciesTreeBuilder,
  FoundationsTree,
} from "../../foundation/FoundationDependenciesTreeBuilder.ts";
import {
  FoundationDependencies,
  KitDependencyAnalyzer,
} from "../../kit/KitDependencyAnalyzer.ts";
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

interface AnalyzeResults {
  controls: ComplianceControlRepository;
  dependencies: {
    foundation: FoundationRepository;
    results: FoundationDependencies;
  }[];
}

const statementExample = `\tcompliance:
\t- control: my/control # id of the control
\t  statement: "description how this module implements measures towards this control"
`;

export function registerTreeCmd(program: Command) {
  program
    .command("tree")
    .type("view", new EnumType(TreeView))
    .description("show the compliance control tree")
    .option("--view [view:view]", "select the primary dimension of the tree", {
      default: "control",
    })
    .action(async (opts: GlobalCommandOptions & TreeOptions) => {
      const repo = new CollieRepository("./");
      const logger = new Logger(repo, opts);

      const results = await analyze(repo, logger);

      if (!results.controls.all.length) {
        logger.warn("no compliance controls found");
        logger.tipCommand(
          `To define a new compliance control run`,
          `compliance new "my-control"`,
        );
        return;
      }

      const hasAnyApplicableStatements = results.dependencies.some((d) =>
        d.results.platforms.some((p) =>
          p.modules.some((m) => m.kitModule?.compliance?.length)
        )
      );

      if (!hasAnyApplicableStatements) {
        logger.warn("no compliance control statement found in a kit module");
        logger.tip(
          `Add a compliance section to your kit module frontmatter like this\n` +
            statementExample,
        );
        return;
      }

      switch (opts.view) {
        case TreeView.Foundation:
          await renderFoundationTree(results);
          break;
        case TreeView.Control:
          await renderControlTree(results);
      }
    });
}

async function analyze(
  repo: CollieRepository,
  logger: Logger,
): Promise<AnalyzeResults> {
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

function renderFoundationTree(results: AnalyzeResults) {
  // note: this is currently the same as "kit tree --view foundation"
  const { dependencies } = results;

  const foundations: FoundationsTree = {};
  dependencies.forEach(({ foundation, results }) => {
    const builder = new FoundationDependenciesTreeBuilder(foundation);
    const tree = builder.build(results, {
      useColors: true,
    });
    Object.assign(foundations, tree);
  });

  const renderedTree = jsonTree({ foundations: foundations }, true);
  console.log(renderedTree);
}

function renderControlTree(results: AnalyzeResults) {
  const { controls, dependencies } = results;

  const builder = new ComplianceControlTreeBuilder(controls);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
