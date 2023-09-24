import { Input } from "x/cliffy/prompt";
import { Logger } from "../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { GlobalCommandOptions } from "./GlobalCommandOptions.ts";
import { CliApiFacadeFactory } from "../api/CliApiFacadeFactory.ts";
import { TopLevelCommand } from "./TopLevelCommand.ts";

export function registerInitCommand(program: TopLevelCommand) {
  program
    .command("init [directory]")
    .description("initialize a new collie repository in a new directory")
    .action(
      async (opts: GlobalCommandOptions, directoryArg: string | undefined) => {
        const directory: string = directoryArg ||
          await Input.prompt(
            `Choose a directory name for your new collie repository`,
          );

        // we would like to create the CollieRepository after git has been initialized
        // but we need it to build git
        const repo = CollieRepository.uninitialized(directory);
        const logger = new Logger(repo, opts);

        // ensure git is initialized
        const cliFactory = new CliApiFacadeFactory(logger);
        const git = cliFactory.buildGit();

        await git.init(directory);

        const dir = new DirectoryGenerator(WriteMode.skip, logger);

        const d: Dir = {
          name: directory,
          entries: [
            { name: "README.md", content: readmeMd },
            { name: ".gitignore", content: gitignore },
            { name: ".gitattributes", content: gitattributes },
            {
              name: "kit",
              entries: [
                { name: ".gitkeep", content: "" },
                { name: "README.md", content: kitReadmeMd },
              ],
            },
            {
              name: "compliance",
              entries: [{ name: ".gitkeep", content: "" }],
            },
            {
              name: "foundations",
              entries: [{ name: ".gitkeep", content: "" }],
            },
          ],
        };

        await dir.write(d);

        // this is the only place where an absolute path is ok, to show the user unambigously where
        // the repository is on their file system
        logger.progress(
          "generated new collie repository at " + repo.resolvePath(),
        );

        logger.tipCommand(
          `change into the collie repository and add a foundation to configure your cloud platforms`,
          "foundation new",
        );
      },
    );
}

const readmeMd = `# Collie Repository

This repository contains configuration for \`collie\` to work with your clouds with a structured workflow.

- \`foundations/\` defines a set of cloud platforms and their configuration
- \`kit/\` stores IaC modules to assemble landing zones on your foundations' cloud platforms
- \`compliance/\` stores compliance controls that your kit modules implement

Collie stores data in the form of "literate" config files - markdown config files with YAML frontmatter.
This approach allows \`collie\` to generate documentation for your cloud foundations later

## Next steps

### Create a new Foundation

Most users of \`collie\` will want to manage one or two cloud foundations (e.g. \`dev\` and \`prod\`).
Create a new foundation and configure it interactively using

\`\`\`shell
collie foundation new
\`\`\`

### Work with cloud tenants

You can list tenants (e.g. AWS Accounts, Azure Subscriptions, GCP Projects) in your cloud foundations and manage tags, cost and IAM using the following commands

\`\`\`shell
collie tenant list "my-foundation"    # List tenants across all clouds in the foundation
collie tenant cost "my-foundation" \
   --from 2021-01-01 --to 2021-01-31  # List tenants costs across all clouds in the foundation
collie tenant iam "my-foundation"     # Review access and permissions on tenants
\`\`\`

### Build Landing Zones

To build landing zones with collie, follow this workflow

\`\`\`shell
collie kit new "aws/organization-policies"   # generate a new IaC module skeleton
collie kit apply "aws/organization-policies" # apply the module to a cloud platform in your foundation
collie foundation deploy "my-foundation"     # deploy the module to your cloud foundation
\`\`\`

### Document Compliance

To document how your landing zones help implement compliance, follow this workflow

\`\`\`shell
collie compliance new "data-privacy/eu-only" # create a new compliance control
vi kit/aws/organization-policies/README.md   # add a compliance statement to your aws organization-policies module
collie compliance tree                       # review compliance control implementation across platforms
collie docs "my-foundation"                  # generate a documentation site for your cloud foundation, incl. compliance info
\`\`\`
`;

const gitignore = `# terraform/terragrunt caches
.terraform
.terragrunt-cache

# collie generated docs
.docs

# collie cache
**.collie.json
**.meta.json
`;

const gitattributes = `# Force LF file endings for all text files
* text eol=lf

# Denote all files that are truly binary and should not be modified.
*.png binary
*.jpg binary
`;

const kitReadmeMd = `# Your Collie Kit

Build your own set of Collie [kit modules](https://landingzone.meshcloud.io/reference/kit-module.html) in this folder.

## Getting Started

\`\`\`shell
collie kit new "aws/organization-policies"   # generate a new IaC module skeleton
collie kit apply "aws/organization-policies" # apply the module to a cloud platform in your foundation
collie foundation deploy "my-foundation"     # deploy the module to your cloud foundation
\`\`\`

You can build your own kit modules from scratch or fork existing kit modules from the [Collie Hub](https://github.com/meshcloud/collie-hub/tree/main/kit)
by copying them here.

> Beware that kit modules identifiers must always have a cloud provider prefix like \`aws/my-module\` in their name.

## Documentation

This page is also included in your cloud foundation's documentation generated with \`collie foundation docs\`. Use this
document to describe anything that engineers working on the kit need to know.
`;
