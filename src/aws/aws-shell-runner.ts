import { ShellRunner } from "../process/shell-runner.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { Credentials } from "./aws.model.ts";

/**
 * This class ensures that each command executed for AWS is suffixed with the `--profile` parameter, as configured
 * for Collie.
 */
export class AwsShellRunner implements ShellRunner {
  constructor(
    private runner: ShellRunner,
    private selectedProfile: string,
  ) {}

  // FIXME this is actually a little broken and only works because of TS/JS weak typing :D Ups. Need to properly fix this and dont modify the
  //   arguments list.

  /**
   * You can optionally input a Credential object that will re-configure the CLI invocation context
   * so this credential is used instead of the selected profile which is used as the default.
   * This is handy if you want to execute commands in the context of another account.
   *
   * @param commandStr AWS CLI programm to be run
   * @param credentials Possible credentials under which the cmd will be executed
   * @returns CLI output
   */
  async run(
    commandStr: string,
    credentials?: Credentials,
  ): Promise<ShellOutput> {
    if (credentials) {
      // As there are not flags for the CLI we must modify the ENV with the credential data for this to work.
      return await this.runner.run(
        `${commandStr}`,
        {
          AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
        },
      );
    } else {
      return await this.runner.run(
        `${commandStr} --profile ${this.selectedProfile}`,
      );
    }
  }
}
