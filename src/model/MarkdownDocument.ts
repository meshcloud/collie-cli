import * as yaml from "std/encoding/yaml";

export type ParseResult<T> =
  | { parsed: MarkdownDocument<Partial<T>>; error: undefined }
  | { parsed: undefined; error: unknown };

export class MarkdownDocument<T> {
  constructor(public frontmatter: T, public document: string) {}

  public format(): string {
    return `---
${yaml.stringify(this.frontmatter as Record<string, unknown>)}
---
${this.document}
`;
  }

  public static parse<T>(text: string): ParseResult<T> {
    try {
      const frontmatterRegex = /^---([\s\S]*)\n---\n([\s\S]*)$/;
      const matches = text.match(frontmatterRegex);

      if (matches && matches.length >= 3) {
        const [_, frontmatterYaml, markdown] = matches;

        const frontmatter = yaml.parse(frontmatterYaml) as Partial<T>;

        return {
          parsed: new MarkdownDocument(frontmatter, markdown),
          error: undefined,
        };
      }

      return {
        parsed: undefined,
        error: new Error(
          "found no frontmatter matching regex " + frontmatterRegex,
        ),
      };
    } catch (error: unknown) {
      return { parsed: undefined, error };
    }
  }
}
