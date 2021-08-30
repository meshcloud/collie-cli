import { Select } from "../deps.ts";
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

  async executeDisconnected(_config: Config) {
    // no op
  }
}