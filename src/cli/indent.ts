/**
 * A very simple way of indenting mulit-line strings
 */
export function indent(input: string, level: number) {
  return input
    .split("\n")
    .map((x) => " ".repeat(level) + x)
    .join("\n");
}
