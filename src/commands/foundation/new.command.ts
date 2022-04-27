import { Command } from "/deps.ts";
import { Logger } from "../../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <foundation>")
    .description("generate a new cloud foundation")
    .action(async (opts: CmdGlobalOptions, foundation: string) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundationPath = repo.resolvePath("foundations", foundation);

      // tbd: generate platform based on authenticated CLIs
      const dir = new DirectoryGenerator(WriteMode.skip, logger);
      const d: Dir = {
        name: foundationPath,
        entries: [{ name: "README.md", content: generateReadmeMd(foundation) }],
      };

      await dir.write(d, "");

      logger.progress(
        "generated new foundation " + repo.relativePath(foundationPath),
      );
    });
}

function generateReadmeMd(foundationName: string) {
  return `---
name: ${foundationName}
---

# ${foundationName}

Welcome to your cloud foundation. 
  `;
}
