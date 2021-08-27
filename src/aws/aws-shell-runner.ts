import { ShellRunner } from "../process/shell-runner.ts";
import { ShellOutput } from "../process/shell-output.ts";

/**
 * This class ensures that each command executed for AWS is suffixed with the `--profile` parameter, as configured
 * for Collie.
 */
export class AwsShellRunner implements ShellRunner {
  constructor(private runner: ShellRunner, private selectedProfile: string) {}

  async run(commandStr: string): Promise<ShellOutput> {
    return await this.runner.run(
      `${commandStr} --profile ${this.selectedProfile}`,
    );
  }
}
