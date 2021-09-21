import { ShellRunner } from "../process/shell-runner.ts";
import { ShellOutput } from "../process/shell-output.ts";

/**
 * This class ensures that each command executed for AWS is suffixed with the `--profile` parameter, as configured
 * for Collie.
 */
export class AwsShellRunner implements ShellRunner {
  constructor(
    private runner: ShellRunner,
    private selectedProfile: string,
  ) {}

  run(
    commandStr: string,
    env?: { [key: string]: string },
  ): Promise<ShellOutput> {
    // We must not attach the profile selector if the ENV specifies another profile to be used. Because otherwise
    // the profile would take precedence.
    const hasAwsCredsInEnv = env &&
      (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY ||
        env.AWS_SESSION_TOKEN);
    if (hasAwsCredsInEnv) {
      return this.runner.run(
        commandStr,
        env,
      );
    } else {
      return this.runner.run(
        `${commandStr} --profile ${this.selectedProfile}`,
        env,
      );
    }
  }
}
