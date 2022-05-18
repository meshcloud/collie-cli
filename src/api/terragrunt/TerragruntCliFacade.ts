import { IProcessRunner } from "../../process/IProcessRunner.ts";
import {
  ProcessResult,
  ProcessRunnerResult,
} from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export type TerragruntRunMode = "plan" | "apply" | "init -upgrade" | "destroy";

export function toVerb(mode: TerragruntRunMode) {
  switch (mode) {
    case "plan":
      return "planning";
    case "apply":
      return "deploying (apply)";
    case "init -upgrade":
      return "initialising";
    case "destroy":
      return "destroying";
    default:
      throw new Error("unkown mode: " + mode);
  }
}

export class TerragruntCliFacade {
  constructor(private runner: IProcessRunner<ProcessResult>) {}

  private async runTerragrunt(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<ProcessRunnerResult> {
    const result = await this.runner.run(commands, options);

    return result;
  }

  async run(cwd: string, mode: TerragruntRunMode) {
    const cmds = ["terragrunt", ...this.modeCommands(mode)];

    return await this.runTerragrunt(cmds, {
      cwd,
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
      case "apply":
        return ["apply", "--terragrunt-ignore-external-dependencies"];
      case "init -upgrade":
        return ["init", "-upgrade", "--terragrunt-non-interactive"];
      case "plan":
        return ["plan", "--terragrunt-ignore-external-dependencies"];
      case "destroy":
        return ["destroy", "--terragrunt-ignore-external-dependencies"];
    }
  }
}
