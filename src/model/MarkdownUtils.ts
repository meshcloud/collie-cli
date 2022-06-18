export class MarkdownUtils {
  static code(content: string) {
    return "`" + content + "`";
  }

  static codeBlock(type: string, content: string) {
    return "```" + type + "\n" + content + "\n```";
  }

  static link(text: string, href: string) {
    return `[${text}](${href})`;
  }

  /**
   * A vuepress custom container, see https://v2.vuepress.vuejs.org/reference/default-theme/markdown.html#custom-containers
   */
  static container(
    type: "warning" | "info" | "tip" | "danger" | "details",
    title: string,
    content: string,
  ): string {
    return `::: ${type} ${title}\n${content}\n:::`;
  }

  static simpleContainer(
    type: "warning" | "info" | "tip" | "danger",
    content: string,
  ): string {
    return `::: ${type}\n${content}\n:::`;
  }
}
