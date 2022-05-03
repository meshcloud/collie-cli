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
import { CallerIdentity } from "../../api/aws/Model.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { MeshError } from "../../errors.ts";
import {
  PlatformConfigAws,
  PlatformConfigAzure,
  PlatformConfigGcp,
} from "../../model/PlatformConfig.ts";
import { Account } from "../../api/az/Model.ts";

export function registerNewCmd(program: Command) {
  program
    .command("new <foundation>")
    .description("generate a new cloud foundation")
    .action(async (opts: CmdGlobalOptions, foundation: string) => {
      const repo = await CollieRepository.load("./");
      const logger = new Logger(repo, opts);

      const foundationPath = repo.resolvePath("foundations", foundation);

      const factory = new CliApiFacadeFactory(logger);

      const platformEntries = await promptPlatformEntries(logger, factory);

      // tbd: generate platform based on authenticated CLIs
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

async function detectPlatform(
  logger: Logger,
  platform: string,
  builder: () => Promise<Dir>,
): Promise<Dir | undefined> {
  try {
    console.log(
      `searching for a valid ${platform} platform in your current environment...`,
    );

    const dir = await builder();

    logger.progress(`detected valid ${platform} platform`);

    return dir;
  } catch (error) {
    console.log(`skipping ${platform}: ${error.message}`);

    return;
  }
}

// todo: should probably refactor these into dedicated classes

async function promptPlatformEntries(
  logger: Logger,
  factory: CliApiFacadeFactory,
) {
  // todo: this is stupidly hardcoded for now, would need some more dynamic detection of platforms and also
  // possibly prompt the user for "do you want to add A? cool, missing a param there, what's your X?" etc.

  const entries: Dir[] = [
    await detectPlatform(logger, "Azure", () => setupAzurePlatform(factory)),
    await detectPlatform(logger, "AWS", () => setupAwsPlatform(factory)),
    await detectPlatform(logger, "GCP", () => setupGcpPlatform(factory)),
  ].filter((x): x is Dir => !!x);

  return entries;
}

async function setupAwsPlatform(factory: CliApiFacadeFactory): Promise<Dir> {
  const aws = await factory.buildAws();
  const id = await aws.getCallerIdentity();
  return {
    name: "aws",
    entries: [{ name: "README.md", content: generateAwsReadmeMd(id) }],
  };
}

function generateAwsReadmeMd(identity: CallerIdentity): string {
  const env = Object.entries(Deno.env.toObject()).filter(([key]) =>
    key.startsWith("AWS_")
  );

  const frontmatter: PlatformConfigAws = {
    name: "aws",
    aws: {
      accountId: identity.Account,
      accountAccessRole: "OrganizationAccountAccessRole", // todo: be more smart about this default
    },
    cli: {
      aws: {
        ...Object.fromEntries(env),
        AWS_PROFILE: Deno.env.get("AWS_PROFILE") || "default",
      },
    },
  };
  const md = `
# AWS

This AWS Platform is hosted in account ${identity.Account}.
  `;

  const doc = new MarkdownDocument(frontmatter, md);

  return doc.format();
}

async function setupGcpPlatform(factory: CliApiFacadeFactory): Promise<Dir> {
  const gcp = await factory.buildGcloud();
  const config = await gcp.configList();
  const project = config?.core?.project;

  if (!project) {
    throw new MeshError(
      "'gcloud config list' does not have a configured project",
    );
  }

  return {
    name: "gcp",
    entries: [{ name: "README.md", content: generateGcpReadmeMd(project) }],
  };
}

function generateGcpReadmeMd(project: string): string {
  const frontmatter: PlatformConfigGcp = {
    name: "gcp",
    gcp: {
      project: project,
    },
    cli: {
      gcloud: {
        CLOUDSDK_ACTIVE_CONFIG_NAME:
          Deno.env.get("CLOUDSDK_ACTIVE_CONFIG_NAME") || "default",
      },
    },
  };
  const md = `
# GCP

This GCP Platform is hosted in the organization containing project ${project}.
  `;

  const doc = new MarkdownDocument(frontmatter, md);

  return doc.format();
}

async function setupAzurePlatform(factory: CliApiFacadeFactory): Promise<Dir> {
  const az = await factory.buildAz();
  const account = await az.getAccount();

  return {
    name: "azure",
    entries: [{ name: "README.md", content: generateAzureReadmeMd(account) }],
  };
}

function generateAzureReadmeMd(account: Account): string {
  const configDir = Deno.env.get("AZURE_CONFIG_DIR");

  const frontmatter: PlatformConfigAzure = {
    name: "azure",
    azure: {
      aadTenantId: account.tenantId,
      subscriptionId: account.id,
    },
    cli: {
      az: {
        ...(configDir && { AZURE_CONFIG_DIR: configDir }),
      },
    },
  };
  const md = `
# Azure

This Azure Platform is hosted in the AAD Tenant \`${account.tenantId}\`.
  `;

  const doc = new MarkdownDocument(frontmatter, md);

  return doc.format();
}
