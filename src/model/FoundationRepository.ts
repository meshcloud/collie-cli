import * as fs from "std/fs";
import * as path from "std/path";
import {
  FoundationConfig,
  MeshStackConfig,
} from "../model/FoundationConfig.ts";
import { CollieRepository } from "./CollieRepository.ts";
import { MarkdownDocument } from "./MarkdownDocument.ts";
import { PlatformConfig } from "./PlatformConfig.ts";

export class FoundationRepository {
  constructor(
    private readonly foundationDir: string,
    private readonly config: FoundationConfig,
  ) {}

  public get name(): string {
    return this.config.name;
  }

  public get platforms(): PlatformConfig[] {
    return this.config.platforms;
  }

  findPlatform(platform: string) {
    const p = this.config.platforms.find((x) => x.name === platform);
    if (!p) {
      throw new Error(
        `Could not find platform named "${platform}" in configuration.`,
      );
    }

    return p;
  }

  /**
   * Resolve a path relative to the foundation
   */
  resolvePath(...pathSegments: string[]) {
    return path.resolve(this.foundationDir, ...pathSegments);
  }

  /**
   * Resolve a path relative to a platform
   */
  resolvePlatformPath(platform: PlatformConfig, ...pathSegments: string[]) {
    return this.resolvePath("platforms", platform.name, ...pathSegments);
  }

  static async load(
    kit: CollieRepository,
    foundation: string,
  ): Promise<FoundationRepository> {
    const foundationDir = kit.resolvePath("foundations", foundation);

    const foundationReadme = await FoundationRepository.parseFoundationReadme(
      kit,
      foundationDir,
    );

    const platforms = await FoundationRepository.parsePlatformReadmes(
      kit,
      foundationDir,
    );

    const config: FoundationConfig = {
      name: foundation,
      meshStack: foundationReadme.frontmatter.meshStack,
      platforms,
    };

    return new FoundationRepository(foundationDir, config);
  }

  private static async parseFoundationReadme(
    kit: CollieRepository,
    foundationDir: string,
  ) {
    const readmePath = path.join(foundationDir, "README.md");
    const text = await Deno.readTextFile(readmePath);
    const md = await MarkdownDocument.parse<FoundationFrontmatter>(text);

    if (!md) {
      throw new Error(
        "Failed to parse foundation README at " + kit.relativePath(readmePath),
      );
    }

    return md;
  }

  private static async parsePlatformReadmes(
    kit: CollieRepository,
    foundationDir: string,
  ): Promise<PlatformConfig[]> {
    const platforms: PlatformConfig[] = [];

    for await (
      const file of fs.expandGlob("platforms/*/README.md", {
        root: foundationDir,
      })
    ) {
      const text = await Deno.readTextFile(file.path);
      const md = await MarkdownDocument.parse<PlatformConfig>(text);

      // todo: validate config is valid?
      const config = md?.frontmatter;
      if (!config) {
        throw new Error(
          "Failed to parse foundation README at " + kit.relativePath(file.path),
        );
      }

      platforms.push(config as PlatformConfig);
    }

    return platforms;
  }
}

interface FoundationFrontmatter {
  name: string;
  meshStack: MeshStackConfig;
}
