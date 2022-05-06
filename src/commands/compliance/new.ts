import { Command, Input } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { ComplianceControl } from "../../compliance/ComplianceControl.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <control> [name]")
    .description("generate a new compliance control")
    .action(async (opts: CmdGlobalOptions, module: string, name?: string) => {
      const kit = new CollieRepository("./");
      const logger = new Logger(kit, opts);

      const controlPath = kit.resolvePath("compliance", module + ".md");
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
    });
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

  await Deno.writeTextFile(controlPath, text);
}
