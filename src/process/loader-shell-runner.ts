import { ShellOutput } from "./shell-output.ts";
import { bold, brightBlue } from "../deps.ts";
import { IShellRunner } from "./shell-runner.interface.ts";
import { TTY } from "../commands/tty.ts";

export class LoaderShellRunner implements IShellRunner {
  private interval?: number;
  private runningCommandsCount = 0;

  private readonly sigIntHandler = () => this.forceStopLoading();
  private readonly sigTermHandler = () => this.forceStopLoading();

  constructor(private runner: IShellRunner, private readonly tty: TTY) {}

  public async run(
    commandStr: string,
    env?: { [key: string]: string }
  ): Promise<ShellOutput> {
    try {
      this.startLoading(commandStr);

      return await this.runner.run(commandStr, env);
    } catch (e) {
      this.forceStopLoading();
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

    this.interval = setInterval(() => {
      this.tty.clearLine();
      const pos = i % loader.length;
      console.log(
        brightBlue(loader[pos]) + " " + bold(this.trimCommandStr(commandStr))
      );
      i++;
      this.tty.goUp(1);
    }, 200);
  }

  private trimCommandStr(commandStr: string): string {
    // Truncate the command to the max size of the tty to avoid "overflowing" of text
    // Might throw on windows.
    let maxLength = 0;
    try {
      const { columns } = Deno.consoleSize(Deno.stdout.rid);
      // we need an extra 2 chars for the loader spacing, 3 for the dots and one for style.
      maxLength = columns - 6;
      maxLength = maxLength < 0 ? 0 : maxLength;
    } catch (_) {
      maxLength = 0;
    }

    if (maxLength > 0 && commandStr.length > maxLength) {
      return commandStr.substr(0, maxLength).trimEnd() + "...";
    } else {
      return commandStr;
    }
  }

  private hideCursor() {
    // Setup a watch for interrupt signals to display the cursor again in case of SIGINT or SIGTERM
    Deno.addSignalListener("SIGINT", this.sigIntHandler);
    Deno.addSignalListener("SIGTERM", this.sigTermHandler);

    this.tty.hideCursor();
  }

  private showCursor() {
    Deno.removeSignalListener("SIGINT", this.sigIntHandler);
    Deno.removeSignalListener("SIGTERM", this.sigTermHandler);

    this.tty.showCursor();
  }

  /**
   * In case of an exception you probably want to force stop the loading animation. Oftherwise the concurrently
   * running commands would still keep the loader spinning which messes with the error text display.
   * This just ignores the commands running in the background and kills off the animation right away.
   */
  private forceStopLoading() {
    this.runningCommandsCount = 0;
    this.stopLoading();
  }

  private stopLoading() {
    // A previously issued forceStopLoading() could set the counter to 0 so we need to make sure
    // other invocations which come in later don't reduce the counter below 0.
    if (this.runningCommandsCount > 0) {
      this.runningCommandsCount--;
    }
    if (this.runningCommandsCount > 0) {
      return;
    }

    this.showCursor();

    clearInterval(this.interval);
    this.interval = undefined;
    this.tty.clearLine();
  }
}
