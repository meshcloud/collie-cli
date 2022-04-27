import * as yaml from "std/encoding/yaml";

export class MarkdownDocument<T> {
  constructor(public frontmatter: T, public document: string) {}

  public format(): string {
    return `---
${yaml.stringify(this.frontmatter as Record<string, unknown>)}
---
${this.document}
`;
  }

  public static parse<T>(text: string) {
    const frontmatterRegex = /^---([\s\S]*)\n---\n([\s\S]*)$/;
    const matches = text.match(frontmatterRegex);

    if (matches && matches.length >= 3) {
      const [_, frontmatterYaml, markdown] = matches;

      const frontmatter = yaml.parse(frontmatterYaml) as Partial<T>;

      return new MarkdownDocument(frontmatter, markdown);
    }
  }
}
