import { AwsCliFacade } from "../api/aws/AwsCliFacade.ts";
import { Input, Select } from "../deps.ts";
import { MeshError } from "../errors.ts";
import {
  CLICommand,
  CLIName,
  Config,
  ConnectedConfigKey,
  writeConfig,
} from "./config.model.ts";
import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";

// TODO: integrate this into a better version of "foundation new" command
export class AwsPostPlatformConfigHook implements PostPlatformConfigHook {
  constructor(private readonly aws: AwsCliFacade) {}

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
    const profiles = await this.aws.listProfiles();
    const availableProfiles = profiles.map((profile) => ({
      name: profile,
      value: profile,
    }));

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
          availableProfiles.join(
            ", ",
          )
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
        "Specify a Role that you can access from your management account with the AssumeRole method:",
      default: "OrganizationAccountAccessRole",
    });

    console.log(`You have chosen the Role: ${selectedRole}`);
    config.aws.accountAccessRole = selectedRole;

    writeConfig(config);
  }
}
