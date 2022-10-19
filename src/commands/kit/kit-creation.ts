import { DirectoryGenerator,WriteMode,Dir } from "../../cli/DirectoryGenerator.ts";
import { Logger } from "../../cli/Logger.ts";

export async function kitDirectoryCreation(modulePath: string, name: string, logger: Logger) {
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const d: Dir = {
    name: modulePath,
    entries: [
      { name: "main.tf", content: mainTf },
      {
        name: "documentation.tf",
        content: generateDocumentationTf(),
      },
      { name: "README.md", content: generateReadmeMd(name) },
      { name: "variables.tf", content: "" },
      { name: "outputs.tf", content: "" },
    ],
  };

  await dir.write(d, "");
}

const mainTf = `# Place your module's terraform resources here as usual.
# Note that you should typically not put a terraform{} block into cloud foundation kit modules,
# these will be provided by the platform implementations using this kit module.
`;

function generateDocumentationTf() {
    return `variable "output_md_file" {
    type        = string
    description = "location of the file where this cloud foundation kit module generates its documentation output"
  }
  
  resource "local_file" "output_md" {
    filename = var.output_md_file
    content = <<EOF
  This documentation is intended as a summary of resources deployed and managed by this module for landing zone consumers
  and security auditors.
  
  ### TODO
  
  TODO: describe the deployed resources and its configuration in a human-friendly way.
  
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
  }
  
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