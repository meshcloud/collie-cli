import { readLines } from "../deps.ts";

export function writeFile(path: string, text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  Deno.writeFileSync(path, data);
}

export function readFile(path: string): string {
  const decoder = new TextDecoder();
  return decoder.decode(Deno.readFileSync(path));
}

export async function askYesNo(question: string): Promise<boolean> {
  console.log(`${question} [y,N]:`);

  for await (const line of readLines(Deno.stdin)) {
    return line.toLowerCase() === "y";
  }
  return false;
}
