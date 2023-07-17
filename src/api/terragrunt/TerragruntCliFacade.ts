import { IProcessRunner } from "../../process/IProcessRunner.ts";
import {
  ProcessResult,
  ProcessResultWithOutput,
  ProcessRunnerResult,
} from "../../process/ProcessRunnerResult.ts";
import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";

export type TerragruntArguments = {
  raw: string[];
};

export interface TerragruntRunAllOpts {
  excludeDirs?: string[];
  autoApprove?: boolean;
}

export interface TerragruntRunOpts {
  autoApprove?: boolean;
}

export function toVerb(args: TerragruntArguments) {
  return `running '${args.raw.join(" ")}' in`;
}

export class TerragruntCliFacade {
  constructor(
    private runner: IProcessRunner<ProcessResult>,
    private quietRunner: IProcessRunner<ProcessResultWithOutput>,
  ) {}

  private async runTerragrunt(
    commands: string[],
    options: ProcessRunnerOptions,
  ): Promise<ProcessRunnerResult> {
    const result = await this.runner.run(commands, options);

    return result;
  }

  async run(cwd: string, mode: TerragruntArguments, opts: TerragruntRunOpts) {
    const autoApproveFlags = opts.autoApprove
      ? [
        "--auto-approve", // --auto-approve is passed to terraform and enables auto approval there
        "--terragrunt-non-interactive", // disable terragrunt's own prompts, e.g. at the start of a terragrunt run-all run
      ]
      : [
        // by default, terragrunt and terraform prompt for all changes
      ];

    const cmds = ["terragrunt", ...mode.raw, ...autoApproveFlags];

    return await this.runTerragrunt(cmds, {
      cwd,
    });
  }

  async runAll(
    cwd: string,
    mode: TerragruntArguments,
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
      ...mode.raw,
      ...excludeDirFlags,
      ...autoApproveFlags,
    ];

    // we do not have to set -auto-approve as run-all automatically includes it
    // see https://terragrunt.gruntwork.io/docs/reference/cli-options/#run-all

    return await this.runTerragrunt(cmds, {
      cwd,
    });
  }

  async collectOutput(cwd: string, outputName: string) {
    const cmds = [
      "terragrunt",
      "output",
      "-raw",
      outputName,
      "--terragrunt-non-interactive", // disable terragrunt's own prompts, e.g. at the start of a terragrunt run-all run
    ];

    return await this.quietRunner.run(cmds, {
      cwd,
    });
  }
}
