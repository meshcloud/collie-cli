import { ShellOutput } from "./shell-output.ts";
import { bold, brightBlue } from "../deps.ts";
import { IShellRunner } from "./shell-runner.interface.ts";
import { TTY } from "../commands/tty.ts";

export class LoaderShellRunner implements IShellRunner {
  private interval?: number;
  private runningCommandsCount = 0;

  private sigInt: Deno.SignalStream | null = null;
  private sigTerm: Deno.SignalStream | null = null;

  constructor(
    private runner: IShellRunner,
    private readonly tty: TTY,
  ) {
  }

  public async run(commandStr: string): Promise<ShellOutput> {
    try {
      this.startLoading(commandStr);

      return await this.runner.run(commandStr);
    } catch (e) {
      throw e;
    } finally {
      this.stopLoading();
    }
  }

  private startLoading(commandStr: string): void {
    this.runningCommandsCount++;
    if (this.interval) {
      return;
    }

    this.hideCursor();

    let i = 0;
    const loader = "|/-\\";
    console.log(brightBlue(loader[i]) + " " + bold(commandStr));
    this.tty.goUp(1);
    this.interval = setInterval(() => {
      const pos = i % loader.length;
      console.log(brightBlue(loader[pos]) + " " + bold(commandStr));
      i++;
      this.tty.goUp(1);
    }, 200);
  }

  private hideCursor() {
    // Setup a watch for interrupt signals to display the cursor again in case of SIGINT or SIGTERM
    this.sigInt = Deno.signal(Deno.Signal.SIGINT);
    this.sigInt!.then(() => this.showCursor());
    this.sigTerm = Deno.signal(Deno.Signal.SIGTERM);
    this.sigTerm!.then(() => this.showCursor());

    this.tty.hideCursor();
  }

  private showCursor() {
    if (this.sigInt) {
      this.sigInt.dispose();
      this.sigInt = null;
    }
    if (this.sigTerm) {
      this.sigTerm.dispose();
      this.sigTerm = null;
    }

    this.tty.showCursor();
  }

  private stopLoading() {
    this.runningCommandsCount--;
    if (this.runningCommandsCount > 0) {
      return;
    }

    clearInterval(this.interval);
    this.interval = undefined;
    this.tty.clearLine();
    this.showCursor();
  }
}
