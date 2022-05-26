import * as path from "std/path";

import { Dir, DirectoryGenerator } from "../cli/DirectoryGenerator.ts";
import { FoundationRepository } from "../model/FoundationRepository.ts";

/**
 * Generates a skeleton for a Vuepress documentation site.
 *
 * In the future we could support other kinds of documentation site generators.
 * In general collie's primary job is to output good markdown, we only include vuepress
 * site generator for convenience/demo.
 */
export class VuepressDocumentationSiteGenerator {
  constructor(private readonly dir: DirectoryGenerator) {}

  async generateSite(foundation: FoundationRepository) {
    const d: Dir = {
      name: "docs",
      entries: [
        { name: "package.json", content: this.generatePackageJson(foundation) },
        { name: ".gitignore", content: this.generateGitignore() },
        {
          name: "docs",
          entries: [
            {
              name: ".vuepress",
              entries: [
                {
                  name: "config.ts",
                  content: this.generateVuepressConfig(foundation),
                },
              ],
            },
          ],
        },
      ],
    };

    const foundationDir = foundation.resolvePath();
    await this.dir.write(d, foundationDir);

    const contentDir = path.join(foundationDir, "docs", "docs");
    return contentDir;
  }

  private generateVuepressConfig(foundation: FoundationRepository) {
    return `import * as fs from "fs";
import * as path from "path";
import {
  DefaultThemeOptions,
  defineUserConfig,
  ViteBundlerOptions,
} from "vuepress-vite";
import type { SidebarConfig, NavbarConfig } from "@vuepress/theme-default";

const navbar: NavbarConfig = [
  { text: "Foundation", link: "/" },
  {
    text: "Platforms",
    link: "/platforms/",
  },
  {
    text: "Kit",
    link: "/kit/",
  },
  {
    text: "Compliance",
    link: "/compliance/",
  },
];

function getMarkdownFiles(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const mdFiles = entries
    .filter(
      (x) => x.isFile() && !x.name.startsWith(".") && x.name.endsWith(".md")
    )
    .map((x) => "/" + path.relative("docs/", path.join(dir, x.name)));

  return mdFiles;
}

function getTree(dir: string) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((x) => x.isDirectory())
    .map((x) => {
      const child = path.join(dir, x.name);
      return {
        text: x.name,
        collapsible: true,
        children: [
          ...getMarkdownFiles(child),
          ...getTree(child),
        ],
      };
    });
}

export const sidebar: SidebarConfig = {
  "/platforms/": [
    {
      text: "Platforms",
      children: getMarkdownFiles("docs/platforms"),
    },
  ],
  "/kit/": [
    {
      text: "Kit",
      children: [...getMarkdownFiles("docs/kit")],
    },
    ...getTree("docs/kit"),
  ],
  "/compliance/": [
    {
      text: "Compliance",
      children: [...getMarkdownFiles("docs/compliance")],
    },
    ...getTree("docs/compliance"),
  ],
};

export default defineUserConfig<DefaultThemeOptions, ViteBundlerOptions>({
  // site-level locales config
  locales: {
    "/": {
      lang: "en-US",
      title: "${foundation.name} Cloud Foundation",
      description: "Documentation for the ${foundation.name} cloud foundations",
    },
  },

  themeConfig: {
    locales: {
      "/": {
        navbar: navbar,
        sidebar: sidebar,
      },
    },
  },
  plugins: [
    [
      "@vuepress/plugin-git",
      {
        createdTime: false,
        updateTime: true,
        contributors: false,
      },
    ],
  ],
});
`;
  }

  private generatePackageJson(foundation: FoundationRepository) {
    const config = {
      name: foundation.id + "-docs",
      version: "1.0.0",
      private: "true",
      scripts: {
        "docs:dev": "vuepress dev docs",
        "docs:build": "vuepress build docs",
      },
      devDependencies: {
        vuepress: "^2.0.0-beta.37",
        "@vuepress/plugin-search": "^2.0.0-beta.37",
      },
    };

    return JSON.stringify(config, null, 2);
  }
  private generateGitignore(): string {
    return `node_modules
.temp
.cache
`;
  }
}
