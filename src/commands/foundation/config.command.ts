import { jsonTree } from "x/json_tree";

import { Command } from "/deps.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { Logger } from "../../cli/Logger.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { FoundationConfigTreeBuilder } from "../../foundation/FoundationConfigTreeBuilder.ts";

export function registerConfigCmd(program: Command) {
  program
    .command("config")
    .description("show cloud foundation config file tree")
    .action(async (opts: GlobalCommandOptions) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundations = await repo.listFoundations();

      const validator = new ModelValidator(logger);

      // tbd: different output formats?
      if (foundations.length) {
        console.log(
          "This repository contains the following foundation configuration files",
        );
        const tasks = foundations.map(
          async (x) => await FoundationRepository.load(repo, x, validator),
        );

        const foundationRepos = await Promise.all(tasks);

        const treeBuilder = new FoundationConfigTreeBuilder();
        const tree = treeBuilder.build(foundationRepos);

        const renderedTree = jsonTree(tree, true);
        console.log(renderedTree);

        logger.tip(
          `Edit the YAML frontmatter in these files to configure your cloud foundation`,
        );
      } else {
        logger.warn("no foundations found");
        logger.tipCommand(`Generate a new foundation using`, `foundation new`);
      }
    });
}
