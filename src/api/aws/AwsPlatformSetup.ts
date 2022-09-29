import { Input, Select } from "/deps.ts";
import { PlatformConfigAws } from "../../model/PlatformConfig.ts";
import { AwsCliFacade } from "./AwsCliFacade.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { Dir } from "../../cli/DirectoryGenerator.ts";
import { CLI } from "../../info.ts";
import { PlatformSetup } from "../PlatformSetup.ts";
import { isWindows } from "../../os.ts";

export class AwsPlatformSetup extends PlatformSetup<PlatformConfigAws> {
  constructor(private readonly aws: AwsCliFacade) {
    super();
  }

  async promptInteractively(): Promise<PlatformConfigAws> {
    // todo: shoudl this be id of the platform instead?
    const { id, name } = await this.promptPlatformName();

    this.progress("detecting available profiles");

    const profiles = await this.aws.listProfiles();

    const profile = await Select.prompt({
      message: "Select an AWS CLI Profile",
      options: profiles,
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264,
      info: true
    });

    this.progress("trying to sign in and get account info");

    const identity = await this.aws.getCallerIdentity(undefined, profile);

    const accountId = await Input.prompt({
      message: `Enter the root account number of your AWS Organization`,
      default: identity.Account,
      hint: "Hit enter tho confirm the signed in account is correct",
    });

    const accountAccessRole = await Input.prompt({
      message:
        `Choose the role to assume in Accounts managed by your AWS Organization`,
      default: "OrganizationAccountAccessRole",
      hint:
        `${CLI} assumes this role in managed accounts to query details like IAM configuration.`,
    });

    let region = await this.aws.getConfig("region", profile);

    // some AWS CLI profiles may not have a default region specified
    // however we need one for some commands, so we ask the user in any case
    this.progress("detecting aws regions");

    const regions = await this.aws.listRegions(profile);
    region = await Select.prompt({
      message: `Choose the default AWS region for collie commands`,
      default: region,
      options: regions.Regions.map((x) => x.RegionName),
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264
      info: true,
    });

    return {
      id,
      name,
      aws: {
        accountAccessRole,
        accountId,
      },
      cli: {
        aws: {
          AWS_PROFILE: profile,
          AWS_REGION: region,
        },
      },
    };
  }

  preparePlatformDir(config: PlatformConfigAws): Dir {
    return {
      name: config.id,
      entries: [
        { name: "README.md", content: this.generateAwsReadmeMd(config) },
      ],
    };
  }

  private generateAwsReadmeMd(config: PlatformConfigAws): string {
    const frontmatter = config;
    const md = `
# ${config.name}
  
This AWS platform uses the AWS Organization with root account #${config.aws.accountId}.
`;

    const doc = new MarkdownDocument(frontmatter, md);

    return doc.format();
  }
}
