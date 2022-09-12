import { IProcessRunner } from "../../process/IProcessRunner.ts";
import {
  ProcessResult,
  ProcessRunnerResult,
} from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export type TerragruntRunMode =
  | "apply"
  | "init -upgrade"
  | {
    raw: string[];
  };

export interface TerragruntRunAllOpts {
  excludeDirs?: string[];
  autoApprove?: boolean;
}

export interface TerragruntRunOpts {
  autoApprove?: boolean;
}

export function toVerb(mode: TerragruntRunMode) {
  if (typeof mode === "string") {
    switch (mode) {
      case "apply":
        return "deploying (apply) in";
      case "init -upgrade":
        return "initializing";
      default:
        throw new Error("unknown mode: " + mode);
    }
  }

  return `running '${mode.raw.join(" ")}' in`;
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

  async run(cwd: string, mode: TerragruntRunMode, opts: TerragruntRunOpts) {
    const autoApproveFlags = opts.autoApprove
      ? [
        "--auto-approve", // --auto-approve is passed to terraform and enables auto approval there
        "--terragrunt-non-interactive", // disable terragrunt's own prompts, e.g. at the start of a terragrunt run-all run
      ]
      : [
        // by default, terragrunt and terraform prompt for all changes
      ];

    const cmds = [
      "terragrunt",
      ...this.modeCommands(mode),
      ...autoApproveFlags,
    ];

    return await this.runTerragrunt(cmds, {
      cwd,
    });
  }

  async runAll(
    cwd: string,
    mode: TerragruntRunMode,
    opts: TerragruntRunAllOpts,
  ) {
    // note: terragrunt docs say "This will only exclude the module, not its dependencies."
    // this may be a problem because we want to exclude bootstrap modules AND their dependencies? needs more testing
    const excludeDirFlags = (opts.excludeDirs || []).flatMap((x) => [
      "--terragrunt-exclude-dir",
      x,
    ]);

    // By default, "terragrunt run-all" auto approves all individual applies, a notable difference to "terragrunt run"
    // which does interactive confirmation prompts by default.
    // This is undesirable for collie beause it unexpectedly changes the behavior when running a single vs. multi-module
    // deploy. We thus force the behavior to be consistent for collie
    const autoApproveFlags = opts.autoApprove
      ? [
        "--auto-approve", // --auto-approve is passed to terraform and enables auto approval there
        "--terragrunt-non-interactive", // disable terragrunt's own prompts, e.g. at the start of a terragrunt run-all run
      ]
      : ["--terragrunt-no-auto-approve"];

    const cmds = [
      "terragrunt",
      "run-all",
      ...this.modeCommands(mode),
      ...excludeDirFlags,
      ...autoApproveFlags,
    ];

    // we do not have to set -auto-approve as run-all automatically includes it
    // see https://terragrunt.gruntwork.io/docs/reference/cli-options/#run-all

    return await this.runTerragrunt(cmds, {
      cwd,
    });
  }

  private modeCommands(mode: TerragruntRunMode) {
    if (typeof mode === "string") {
      switch (mode) {
        case "apply":
          return ["apply", "--terragrunt-ignore-external-dependencies"];
        case "init -upgrade":
          return ["init", "-upgrade", "--terragrunt-non-interactive"];
        default:
          throw new Error("unknown mode: " + mode);
      }
    }

    return mode.raw;
  }
}
