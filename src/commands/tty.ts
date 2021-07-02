const ESC = "\u001B[";
const UP = "A";
const HIDE = "?25l";
const SHOW = "?25h";
const CLEAR_LINE = "2K";

export const isatty = Deno.isatty(Deno.stdout.rid);

export class TTY {
  private enc = new TextEncoder();

  goUp(rows: number) {
    this.writeCommand(rows + UP);
  }

  hideCursor() {
    this.writeCommand(HIDE);
  }

  clearLine() {
    this.writeCommand(CLEAR_LINE);
  }

  showCursor() {
    this.writeCommand(SHOW);
  }

  private writeCommand(command: string) {
    Deno.stdout.writeSync(this.enc.encode(ESC + command));
  }
}
