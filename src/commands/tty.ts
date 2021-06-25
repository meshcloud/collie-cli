const ESC = "\u001B[";
const UP = "A";
const HIDE = "?25l";
const SHOW = "?25h";
const CLEAR_LINE = "2K";

const enc = new TextEncoder();

export function goUp(rows: number) {
  writeCommand(rows + UP);
}

export function hideCursor() {
  writeCommand(HIDE);
}

export function clearLine() {
  writeCommand(CLEAR_LINE);
}

export function showCursor() {
  writeCommand(SHOW);
}

function writeCommand(command: string) {
  Deno.stdout.write(enc.encode(ESC + command));
}
