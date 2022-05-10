import { Command, Input } from "../../deps.ts";
import { Logger } from "../../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <module> [name]")
    .description("generate a new kit module")
    .action(
      async (opts: GlobalCommandOptions, module: string, name?: string) => {
        const kit = new CollieRepository("./");
        const logger = new Logger(kit, opts);

        const modulePath = kit.resolvePath("kit", module);
        if (!name) {
          name = await Input.prompt({
            message: `Choose a human-friendly name for this module`,
            minLength: 1,
          });
        }

        if (!name) {
          throw new Error("input prompt was not successful");
        }

        const dir = new DirectoryGenerator(WriteMode.skip, logger);
        const d: Dir = {
          name: modulePath,
          entries: [
            { name: "main.tf", content: mainTf },
            { name: "documentation.tf", content: documentationTf },
            { name: "README.md", content: generateReadmeMd(name) },
            { name: "variables.tf", content: "" },
            { name: "outputs.tf", content: "" },
          ],
        };

        await dir.write(d, "");

        logger.progress("generated new module " + kit.relativePath(modulePath));
      },
    );
}

const mainTf =
  `# Place your module's terraform resources, variables, outputs etc. here as usual.
# Note that you should typically not put a terraform{} block into cloud foundation kit modules,
# these will be provided by the platform implementations using this kit module.
`;

const documentationTf = `variable "output_md_file" {
  type        = string
  description = "location of the file where this cloud foundation kit module generates its documentation output"
}

resource "local_file" "output_md" {
  filename = var.output_md_file
  # tip: 
  # pro-tip: you can 
  content = <<EOF

### Kit Module Description

TODO: describe the deployed resources and module configuration in a human-friendly way.

This output is going to be included in generated cloud foundation documentation of each platform that uses this
kit module.

::: tip
Here are some useful tips

- This file is proper \`markdown\`. 
- Use h3 and h4 level headings to add sections to the kit module description
- You can use terraform variables, resources and outputs defined anywhere in this terraform module, to templatise it, 
  e.g. this is the location where this documentation comes from: \`\${var.output_md_file}\`
- Leverage terraform's \`templatefile()\` function for more complex templates
::: 
EOF
}
`;

function generateReadmeMd(moduleName: string) {
  return `---
name: ${moduleName}
summary: |
  deploys new cloud foundation infrastructure.
  Add a concise description of the module's purpose here.
# optional: add additional metadata about implemented security controls
---

# ${moduleName}

This documentation is intended as a reference documentation for cloud foundation or platform engineers using this module.
  `;
}
