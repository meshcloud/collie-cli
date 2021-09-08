import { AwsShellRunner } from "../aws/aws-shell-runner.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { CLICommand, Config } from "../config/config.model.ts";
import { MeshError } from "../errors.ts";
import { ShellRunnerFactory } from "../process/shell-runner-factory.ts";
import { ShellRunner } from "../process/shell-runner.ts";

export class AwsShellRunnerFactory extends ShellRunnerFactory {
  constructor(private readonly config: Config) {
    super();
  }

  buildShellRunner(options: CmdGlobalOptions): ShellRunner {
    const shellRunner = super.buildShellRunner(options);

    const selectedProfile = this.config.aws.selectedProfile;
    if (!selectedProfile) {
      throw new MeshError(
        `No AWS CLI profile selected. Please run '${CLICommand} config aws' to configure it`,
      );
    }

    return new AwsShellRunner(shellRunner, selectedProfile);
  }
}