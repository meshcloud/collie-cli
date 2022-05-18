import * as colors from "std/fmt/colors";
import { Command, prompt, Select } from "/deps.ts";
import { Logger } from "../../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { PlatformConfig } from "../../model/PlatformConfig.ts";
import { AwsPlatformSetup } from "../../api/aws/AwsPlatformSetup.ts";
import { AzPlatformSetup } from "../../api/az/AzPlatformSetup.ts";
import { GcloudPlatformSetup } from "../../api/gcloud/GcloudPlatformSetup.ts";
import { PlatformSetup } from "../../api/PlatformSetup.ts";
import { MeshError } from "../../errors.ts";
import { CLI } from "../../info.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <foundation:foundation>")
    .description("generate a new cloud foundation")
    .action(async (opts: GlobalCommandOptions, foundation: string) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundationPath = repo.resolvePath("foundations", foundation);

      const factory = new CliApiFacadeFactory(repo, logger);

      const platformEntries = await promptPlatformEntries(foundation, factory);

      const dir = new DirectoryGenerator(WriteMode.skip, logger);
      const d: Dir = {
        name: foundationPath,
        entries: [
          { name: "README.md", content: generateReadmeMd(foundation) },
          {
            name: "platforms",
            entries: platformEntries,
          },
        ],
      };

      await dir.write(d, "");

      logger.progress(
        "generated new foundation at " + repo.relativePath(foundationPath),
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

async function promptPlatformEntries(
  foundation: string,
  factory: CliApiFacadeFactory,
): Promise<Dir[]> {
  // todo: this is stupidly hardcoded for now, would need some more dynamic detection of platforms and also
  // possibly prompt the user for "do you want to add A? cool, missing a param there, what's your X?" etc.

  const entries: PlatformConfig[] = [];

  const setup = {
    aws: new AwsPlatformSetup(factory.buildAws()),
    azure: new AzPlatformSetup(factory.buildAz()),
    gcp: new GcloudPlatformSetup(factory.buildGcloud()),
  };

  await prompt([
    {
      name: "action",
      message: "Select an action to continue",
      type: Select,
      options: [
        { value: "add", name: `${colors.green("+")} add cloud platform` },
        { value: "done", name: `${colors.green("✔")} save & exit` },
        { value: "cancel", name: `${colors.red("x")} exit` },
      ],
      hint:
        "After completing the setup, you can always edit the generated foundation configuration files manually.",
      before: async (_, next) => {
        renderEntries(foundation, entries);
        await next();
      },
      after: async ({ action }, next) => {
        switch (action) {
          case "add":
            await next("cloud"); // loop;
            break;
          case "done":
            return;
          case "cancel":
            Deno.exit(1);
        }
      },
    },
    {
      name: "cloud",
      message: "What type of cloud do you want to add",
      type: Select,
      options: [
        { value: "aws", name: "AWS" },
        { value: "azure", name: "Azure" },
        { value: "gcp", name: "GCP" },
      ],
      after: async ({ cloud }, next) => {
        if (!cloud) {
          throw new Error("no cloud selected");
        }

        const platformSetup = (
          setup as Record<string, PlatformSetup<PlatformConfig>>
        )[cloud];
        if (!platformSetup) {
          throw new Error("no supported platform setup for " + cloud);
        }

        const config = await platformSetup.promptInteractively();
        entries.push(config);

        await next("action");
      },
    },
  ]);

  const dirs = entries.map((x) => {
    if ("aws" in x) {
      return setup.aws.preparePlatformDir(x);
    } else if ("azure" in x) {
      return setup.azure.preparePlatformDir(x);
    } else if ("gcp" in x) {
      return setup.gcp.preparePlatformDir(x);
    }

    throw new MeshError("Unsupported platform configuration");
  });

  return dirs;
}

function renderEntries(foundation: string, entries: PlatformConfig[]) {
  console.log(
    colors.bold(
      `Interactively configure your new cloud foundation "${foundation}"`,
    ),
  );
  console.log(
    `${CLI} will generate the following platform configurations under ./foundations/${foundation}/platforms/`,
  );
  console.log();

  if (!entries.length) {
    console.log(colors.italic("\tno platforms configured yet"));
  } else {
    const list = entries.map((x) => `\t- ${x.id}`).join("\n");
    console.log(list);
  }

  console.log(""); // this will automatically add a newline
}
