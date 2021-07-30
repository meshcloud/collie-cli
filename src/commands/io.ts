export function writeFile(path: string, text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  Deno.writeFileSync(path, data);
}

export function readFile(path: string): string {
  const decoder = new TextDecoder();
  return decoder.decode(Deno.readFileSync(path));
}
