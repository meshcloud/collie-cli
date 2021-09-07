import { Input, Select } from "../deps.ts";
import { AwsErrorCode, MeshAwsPlatformError, MeshError } from "../errors.ts";
import { ShellRunner } from "../process/shell-runner.ts";
import {
  CLICommand,
  CLIName,
  Config,
  ConnectedConfigKey,
  writeConfig,
} from "./config.model.ts";
import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";

export class AwsPostPlatformConfigHook implements PostPlatformConfigHook {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  isExecutable(platform: ConnectedConfigKey): boolean {
    return platform === "AWS";
  }

  async executeConnected(config: Config) {
    await this.configureAwsProfile(config);
    await this.configureAccountAccessRole(config);
  }

  private async configureAwsProfile(config: Config) {
    if (config.aws.selectedProfile) {
      console.log(
        `There was an AWS profile selected: '${config.aws.selectedProfile}'. To change this profile run '${CLICommand} config aws'`,
      );
      return;
    }

    console.log(
      `There is no default AWS profile selected. You must set a profile with access to a management account which contains your AWS organization.
Without management account credentials ${CLIName} won't be able to execute the commands it needs in order to log the required account information.`,
    );
    console.log(
      `${CLIName} will now scan for the usable AWS profiles and give you a selection.`,
    );

    // Get the installed profiles.
    const command = "aws configure list-profiles";
    const result = await this.shellRunner.run(command);

    if (result.code != 0) {
      throw new MeshAwsPlatformError(
        AwsErrorCode.AWS_CLI_GENERAL,
        result.stderr,
      );
    }

    const availableProfiles = result.stdout.trim().split("\n").map(
      (profile) => ({ name: profile, value: profile }),
    );

    // Prompt the user with the found profiles.
    const selectedProfile: string = await Select.prompt({
      message:
        "Choose an AWS CLI profile with access to the management account",
      options: availableProfiles,
    });

    // Make a validity check.
    if (
      !availableProfiles.find((profile) => profile.value === selectedProfile)
    ) {
      throw new MeshError(
        `Your selection '${selectedProfile}' is not present in the available profiles: ${
          availableProfiles.join(", ")
        }`,
      );
    }

    console.log(`You have chosen profile: ${selectedProfile}`);
    config.aws.selectedProfile = selectedProfile;

    writeConfig(config);
  }

  private async configureAccountAccessRole(config: Config) {
    if (config.aws.accountAccessRole) {
      console.log(
        `There was an AWS account access role defined: '${config.aws.accountAccessRole}'. To change this role run '${CLICommand} config aws'`,
      );
      return;
    }

    console.log(
      `There is no AWS account access role selected. You must set a role with access to the account you want to scan. This role usually is called the 'OrganizationAccountAccessRole'.`,
    );

    // Prompt the user with the found profiles.
    const selectedRole: string = await Input.prompt({
      message:
        "Choose an AWS CLI profile with access to the management account",
      suggestions: ["OrganizationAccountAccessRole"],
    });

    console.log(`You have selected: ${selectedRole}`);
    config.aws.accountAccessRole = selectedRole;

    writeConfig(config);
  }

  async executeDisconnected(_config: Config) {
    // no op
  }
}
