import * as path from "std/path";

import { Input } from "x/cliffy/prompt";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { ComplianceControl } from "../../compliance/ComplianceControl.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { validateIsPrefixedId } from "../../cli/validation.ts";
import { ValidationError } from "x/cliffy/command";
import { CLI } from "../../info.ts";

const idValidationMessage =
  "Control ids must contain a prefix for a control framework path like 'framework/control'.";

export function registerNewCmd(program: TopLevelCommand) {
  program
    .command("new <control> [name]")
    .description(
      `Generate a new compliance control with the specified id.\n${idValidationMessage}`,
    )
    .example(
      "create a new control",
      `${CLI} compliance new iso27001/8.2-privileged-access-rights`,
    )
    .action(
      async (opts: GlobalCommandOptions, control: string, name?: string) => {
        if (!validateIsPrefixedId(control)) {
          throw new ValidationError(idValidationMessage);
        }

        const kit = await CollieRepository.load();
        const logger = new Logger(kit, opts);

        const controlPath = kit.resolvePath("compliance", control + ".md");
        if (!name) {
          name = await Input.prompt({
            message: `Choose a human-friendly name for this control`,
            minLength: 1,
          });
        }

        if (!name) {
          throw new Error("input prompt was not successful");
        }

        await generateControl(controlPath, name);

        logger.progress(
          "generated new control at " + kit.relativePath(controlPath),
        );
      },
    );
}

async function generateControl(controlPath: string, name: string) {
  const control: ComplianceControl = {
    name: name,
    summary:
      "describe the compliance control here. Include an optional link to point at an extended definition.",
    link: "http://example.com",
  };

  const document = `# ${name}

  `;

  const md = new MarkdownDocument<ComplianceControl>(control, document);
  const text = md.format();

  await Deno.mkdir(path.dirname(controlPath), { recursive: true });
  await Deno.writeTextFile(controlPath, text);
}
