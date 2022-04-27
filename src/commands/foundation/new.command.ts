import { Command } from "/deps.ts";
import { Logger } from "../../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { CallerIdentity } from "../../api/aws/aws.model.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <foundation>")
    .description("generate a new cloud foundation")
    .action(async (opts: CmdGlobalOptions, foundation: string) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundationPath = repo.resolvePath("foundations", foundation);

      // todo: this is stupidly hardcoded for now, would need some more dynamic detection of platforms and also
      // possibly prompt the user for "do you want to add A? cool, missing a param there, what's your X?" etc.
      const factory = new CliApiFacadeFactory(logger);
      const aws = await factory.buildAws(opts);

      const identity = await aws.getCallerIdentity();

      // tbd: generate platform based on authenticated CLIs
      const dir = new DirectoryGenerator(WriteMode.skip, logger);
      const d: Dir = {
        name: foundationPath,
        entries: [
          { name: "README.md", content: generateReadmeMd(foundation) },
          {
            name: "platforms",
            entries: [
              {
                name: "aws",
                entries: [
                  { name: "README.md", content: generateAwsReadmeMd(identity) },
                ],
              },
            ],
          },
        ],
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

function generateAwsReadmeMd(identity: CallerIdentity): string {
  const env = Object.entries(Deno.env.toObject()).filter(([key]) =>
    key.startsWith("AWS_")
  );

  const frontmatter = {
    platformType: "AWS",
    aws: {
      account: identity.Account,
    },
    env: Object.fromEntries(env),
  };
  const md = `
# AWS ${identity.Account}

This AWS Platform is hosted in account ${identity.Account}.
  `;

  const doc = new MarkdownDocument(frontmatter, md);

  return doc.format();
}
