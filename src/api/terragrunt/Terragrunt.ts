import { IProcessRunner } from "../../process/IProcessRunner.ts";
import {
  ProcessResult,
  ProcessRunnerResult,
} from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export type TerragruntRunMode =
  | "plan"
  | "apply -auto-approve"
  | "init -upgrade";

export function toVerb(mode: TerragruntRunMode) {
  switch (mode) {
    case "plan":
      return "deploying (plan)";
    case "apply -auto-approve":
      return "deploying (apply)";
    case "init -upgrade":
      return "initialising";
    default:
      throw new Error("unkown mode: " + mode);
  }
}

export class Terragrunt {
  constructor(private runner: IProcessRunner<ProcessResult>) {}

  private async runTerragrunt(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<ProcessRunnerResult> {
    const result = await this.runner.run(commands, options);

    return result;
  }

  async run(cwd: string, env: Record<string, string>, mode: TerragruntRunMode) {
    const cmds = ["terragrunt", ...this.modeCommands(mode)];

    return await this.runTerragrunt(cmds, {
      cwd,
      env,
    });
  }

  async runAll(cwd: string, mode: TerragruntRunMode) {
    // note: terragrunt docs say "This will only exclude the module, not its dependencies."
    // this may be a problem because we want to exclude bootstrap modules AND their dependencies? needs more testing
    const cmds = ["terragrunt", "run-all", ...this.modeCommands(mode)];

    // we do not have to set -auto-approve as run-all automatically includes it
    // see https://terragrunt.gruntwork.io/docs/reference/cli-options/#run-all

    return await this.runTerragrunt(cmds, {
      cwd,
    });
  }

  private modeCommands(mode: TerragruntRunMode) {
    switch (mode) {
      case "apply -auto-approve":
        return ["apply", "-auto-approve", "--terragrunt-non-interactive"];
      case "init -upgrade":
        return ["init", "-upgrade", "--terragrunt-non-interactive"];
      case "plan":
        return ["plan", "--terragrunt-non-interactive"];
    }
  }
}
