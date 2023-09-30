import * as fs from "std/fs";
import * as path from "std/path";
import { MeshError } from "../errors.ts";
import {
  FoundationConfig,
  FoundationFrontmatter,
} from "../model/FoundationConfig.ts";
import { CollieRepository } from "./CollieRepository.ts";
import { MarkdownDocument } from "./MarkdownDocument.ts";
import { PlatformConfig, PlatformFrontmatter } from "./PlatformConfig.ts";
import {
  CollieFoundationDoesNotExistError,
  CollieModelValidationError,
  ColliePlatformDoesNotExistError,
  ModelValidator,
} from "./schemas/ModelValidator.ts";

export class FoundationRepository {
  constructor(
    private readonly foundationDir: string,
    private readonly config: FoundationConfig,
  ) {}

  public get id(): string {
    return this.config.id;
  }

  public get name(): string {
    return this.config.name;
  }

  public get platforms(): PlatformConfig[] {
    return this.config.platforms;
  }

  findPlatform(platform: string) {
    const p = this.config.platforms.find((x) => x.id === platform);
    if (!p) {
      throw new Error(
        `Could not find platform with id "${platform}" in configuration.`,
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
    return this.resolvePath("platforms", platform.id, ...pathSegments);
  }

  static async load(
    kit: CollieRepository,
    foundation: string,
    validator: ModelValidator,
  ): Promise<FoundationRepository> {
    const foundationDir = kit.resolvePath("foundations", foundation);

    const foundationReadme = await FoundationRepository.parseFoundationReadme(
      kit,
      foundationDir,
      validator,
    );

    const platforms = await FoundationRepository.parsePlatformReadmes(
      kit,
      foundationDir,
      validator,
    );

    const config: FoundationConfig = {
      id: foundation,
      name: foundationReadme.name || foundation,
      meshStack: foundationReadme.meshStack,
      platforms,
    };

    return new FoundationRepository(foundationDir, config);
  }

  private static async parseFoundationReadme(
    kit: CollieRepository,
    foundationDir: string,
    validator: ModelValidator,
  ) {
    const readmePath = path.join(foundationDir, "README.md");

    const text = await FoundationRepository.readFoundationReadme(
      kit,
      readmePath,
    );

    const { parsed, error } = await MarkdownDocument.parse<
      FoundationFrontmatter
    >(text);

    if (!parsed?.frontmatter) {
      throw new MeshError(
        "Failed to parse foundation README frontmatter at " +
          kit.relativePath(readmePath),
        error,
      );
    }

    const config = {
      name: path.basename(foundationDir), // default the name to the directory name
      ...parsed.frontmatter,
    };

    const { data, errors } = validator.validateFoundationFrontmatter(config);

    // todo: this is not a proper error handling strategy - throw exceptions instead?
    if (errors) {
      throw new CollieModelValidationError(
        "Invalid foundation configuration at " + kit.relativePath(readmePath),
        errors,
      );
    }

    return data;
  }

  private static async readFoundationReadme(
    collie: CollieRepository,
    readmePath: string,
  ) {
    try {
      return await Deno.readTextFile(readmePath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new CollieFoundationDoesNotExistError(
          "Could not find a foundation configuration at " +
            collie.relativePath(readmePath) +
            ". Did you specify the wrong foundation id?",
        );
      }

      throw error;
    }
  }

  private static async parsePlatformReadmes(
    collie: CollieRepository,
    foundationDir: string,
    validator: ModelValidator,
  ): Promise<PlatformConfig[]> {
    const q = await collie.processFilesGlob(
      `${foundationDir}/platforms/*/README.md`,
      (file) => FoundationRepository.parseReadme(collie, file, validator),
    );

    const platforms = await Promise.all(q);

    return platforms;
  }

  private static async parseReadme(
    collie: CollieRepository,
    file: fs.WalkEntry,
    validator: ModelValidator,
  ) {
    const text = await this.readPlatformReadme(collie, file.path);
    const { parsed, error } = MarkdownDocument.parse<PlatformFrontmatter>(text);
    if (!parsed?.frontmatter) {
      throw new MeshError(
        "Failed to parse platform README frontmatter at " +
          collie.relativePath(file.path),
        error,
      );
    }

    const id = path.basename(path.dirname(file.path));
    const config = {
      id,
      name: id,
      ...parsed.frontmatter,
    };

    const { data, errors } = validator.validatePlatformConfig(config);

    if (errors) {
      throw new CollieModelValidationError(
        "Invalid foundation at " + collie.relativePath(file.path),
        errors,
      );
    }

    return data;
  }

  private static async readPlatformReadme(
    kit: CollieRepository,
    readmePath: string,
  ) {
    try {
      return await Deno.readTextFile(readmePath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new ColliePlatformDoesNotExistError(
          "Could not find a platform configuration at " +
            kit.relativePath(readmePath) +
            ". Did you specify the wrong platform id?",
        );
      }

      throw error;
    }
  }
}
