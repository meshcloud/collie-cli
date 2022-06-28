export class LiteralArgsParser {
  static parse(raw: string[]) {
    const index = raw.indexOf("--");
    if (index < 0) {
      return [];
    } else {
      return raw.slice(index + 1);
    }
  }
}
