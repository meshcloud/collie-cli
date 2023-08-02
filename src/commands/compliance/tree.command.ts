import { jsonTree } from "x/json_tree";

import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { ComplianceControlRepository } from "../../compliance/ComplianceControlRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { ComplianceControlTreeBuilder } from "../../compliance/ComplianceControlTreeBuilder.ts";
import {
  AnalyzeResults,
  prepareAnalyzeCommand,
} from "../prepareAnalyzeCommand.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";

const statementExample = `\tcompliance:
\t- control: my/control # id of the control
\t  statement: "description how this module implements measures towards this control"
`;

export function registerTreeCmd(program: TopLevelCommand) {
  program
    .command("tree")
    .description("show the compliance control tree with module implementations")
    .action(async (opts: GlobalCommandOptions) => {
      const repo = await CollieRepository.load();
      const logger = new Logger(repo, opts);

      const results = await prepareAnalyzeCommand(repo, logger);

      const validator = new ModelValidator(logger);
      const controls = await ComplianceControlRepository.load(
        repo,
        validator,
        logger,
      );

      if (!controls.all.length) {
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

      await renderControlTree(repo, results, controls);
    });
}

function renderControlTree(
  collie: CollieRepository,
  results: AnalyzeResults,
  controls: ComplianceControlRepository,
) {
  const { dependencies } = results;

  const builder = new ComplianceControlTreeBuilder(collie, controls);

  const tree = builder.build(dependencies.map((x) => x.results));

  const renderedTree = jsonTree(tree, true);
  console.log(renderedTree);
}
