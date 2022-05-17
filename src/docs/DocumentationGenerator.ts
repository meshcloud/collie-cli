import * as fs from "std/fs";
import * as path from "std/path";
import { jsonTree } from "x/json_tree";

import { Dir, DirectoryGenerator, File } from "../cli/DirectoryGenerator.ts";
import { Logger } from "../cli/Logger.ts";
import { FoundationDependenciesTreeBuilder } from "../foundation/FoundationDependenciesTreeBuilder.ts";
import {
  KitDependencyAnalyzer,
  KitModuleDependency,
  PlatformDependencies,
} from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import { MarkdownUtils } from "../model/MarkdownUtils.ts";
import { KitModuleDocumentationGenerator } from "./KitModuleDocumentationGenerator.ts";

const md = MarkdownUtils;

export function kitModuleSorter(
  x: KitModuleDependency,
  y: KitModuleDependency,
): number {
  // bootstrap module always goes first, otherwise sort lexicpgraphically by path
  return x.kitModulePath.endsWith("bootstrap")
    ? -1
    : x.kitModulePath.localeCompare(y.kitModulePath);
}
export class DocumentationGenerator {
  constructor(
    private readonly kit: CollieRepository,
    private readonly foundation: FoundationRepository,
    private readonly kitDependencyAnalyzer: KitDependencyAnalyzer,
    private readonly kitModuleDocumentation: KitModuleDocumentationGenerator,
    private readonly dir: DirectoryGenerator,
    private readonly logger: Logger,
  ) {}

  async generateFoundationDocumentation() {
    const d: Dir = {
      name: "docs",
      entries: [
        { name: "package.json", content: this.generatePackageJson() },
        { name: ".gitignore", content: this.generateGitignore() },
        {
          name: "docs",
          entries: [
            {
              name: ".vuepress",
              entries: [
                { name: "config.ts", content: this.generateVuepressConfig() },
              ],
            },
            { name: "README.md", content: this.generateFoundationReadme() },
            {
              name: "platforms",
              entries: [
                { name: "README.md", content: this.generatePlatformsReadme() },
                ...(await this.generatePlatformDocumentations()),
              ],
            },
          ],
        },
      ],
    };

    const foundationDir = this.foundation.resolvePath();

    await this.dir.write(d, foundationDir);

    await this.copyComplianceDocumentation();

    const docsKitDir = this.foundation.resolvePath("docs", "docs", "kit");
    await this.kitModuleDocumentation.generate(docsKitDir);
  }

  private generateFoundationReadme() {
    // TODO: replace this with an actual README.md file and then just append the platform links?
    const platformLinks = this.foundation.platforms
      .map((x) => `- [${x.id}](./platforms/${x.id}/)`)
      .join("\n");

    const md = `# Cloud Foundation ${this.foundation.name}

This foundation has the following platforms: 

${platformLinks}
`;

    return md;
  }

  private generateVuepressConfig() {
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
      title: "meshcloud-dev Cloud Foundation",
      description: "Documentation for the meshcloud-dev cloud foundations",
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

  private generatePackageJson() {
    const config = {
      name: this.foundation.id + "-docs",
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

  private async generatePlatformDocumentations(): Promise<File[]> {
    const foundationDependencies = await this.kitDependencyAnalyzer
      .findKitModuleDependencies(
        this.foundation,
      );

    return foundationDependencies.platforms.map((p) => ({
      name: p.platform.id + ".md",
      content: this.generatePlatforDocumentation(p),
    }));
  }

  private generatePlatformsReadme(): string {
    return `# Introduction

This section describes the platforms.`;
  }

  private generatePlatforDocumentation(
    dependencies: PlatformDependencies,
  ): string {
    const builder = new FoundationDependenciesTreeBuilder(this.foundation);

    const moduleTree = builder.buildPlatformsTree([dependencies], {
      useColors: false,
    });
    const renderedTree = jsonTree(moduleTree, true);

    const kitModuleImplementationDescriptions = dependencies.modules
      .sort(kitModuleSorter)
      .map((x) => {
        // todo: render kit module link
        // todo: include kit module output.md
        if (!x.kitModule) {
          return MarkdownUtils.container(
            "warning",
            "Invalid Kit Module Dependency",
            "Could not find kit module at " +
              MarkdownUtils.code(x.kitModulePath),
          );
        }

        return `## ${x.kitModule.name}

::: tip Kit module
The [${x.kitModule.name} kit module](/${x.kitModulePath}.md) ${x.kitModule.summary}
:::

${
          x.kitModuleOutput ||
          `<!-- did not find output at ${x.kitModuleOutputPath} -->`
        }
`;
      })
      .join("\n");

    const platformDir = this.kit.relativePath(
      this.foundation.resolvePlatformPath(dependencies.platform),
    );

    return `# ${dependencies.platform.name}

The following section describe the configuration of this cloud platform based on the applied kit modules.
Each section includes a link to the relevant [kit module](/kit/) documentation. Review this documentation to learn more
about the kit module and its [compliance](/compliance/) statements.

${kitModuleImplementationDescriptions}

## Discovered dependencies

This documentation was generated based on the following auto-discovered dependencies of 
${md.code("terragrunt.hcl")} files in ${md.code(platformDir)}.

${md.codeBlock("text", renderedTree)}

::: tip
You can generate this output using the ${
      md.code(
        "foundation kit tree --view foundation",
      )
    } command.
:::
`;
  }

  private async copyComplianceDocumentation() {
    const source = "compliance/"; // todo: should resolve this from kit repository?
    const dest = this.foundation.resolvePath("docs", "docs", "compliance/");

    this.logger.verbose(
      (fmt) =>
        `copying (recursive) ${fmt.kitPath(source)} to ${fmt.kitPath(dest)}`,
    );
    await Deno.mkdir(path.dirname(dest), { recursive: true });
    await fs.copy(source, dest, { overwrite: true });
  }
}
