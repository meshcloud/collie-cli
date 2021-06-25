import { ShellOutput } from "./shell-output.ts";
import { bold, brightBlue } from "../deps.ts";
import { IShellRunner } from "./shell-runner.interface.ts";
import * as tty from "../commands/tty.ts";

export class LoaderShellRunner implements IShellRunner {
  private interval?: number;
  private lastCommand = "";
  private runningCommandsCount = 0;
  private enc = new TextEncoder();

  private istty: boolean;

  constructor(private runner: IShellRunner) {
    // we must determine this once because later checks can throw an error if we
    // call this too often while logging due to race conditions:
    // error: Uncaught (in promise) Busy: Resource is unavailable because it is in use by a promise
    this.istty = Deno.isatty(Deno.stdout.rid);
  }

  public async run(commandStr: string): Promise<ShellOutput> {
    try {
      this.lastCommand = commandStr;
      this.startLoading(commandStr);
      const result = await this.runner.run(commandStr);
      this.stopLoading();
      return result;
    } catch (e) {
      this.stopLoading();
      throw e;
    }
  }

  private startLoading(commandStr: string): void {
    this.runningCommandsCount++;
    if (!this.istty) {
      return;
    }
    if (this.interval) {
      return;
    }

    tty.hideCursor();

    let i = 0;
    const loader = "|/-\\";
    console.log(brightBlue(loader[i]) + " " + bold(commandStr));
    tty.goUp(1);
    this.interval = setInterval(() => {
      const pos = i % loader.length;
      console.log(brightBlue(loader[pos]) + " " + bold(this.lastCommand));
      i++;
      tty.goUp(1);
    }, 200);
  }

  private stopLoading() {
    this.runningCommandsCount--;
    if (!this.istty || this.runningCommandsCount > 0) {
      return;
    }
    clearInterval(this.interval);
    this.interval = undefined;
    tty.clearLine();
    tty.showCursor();
  }
}
