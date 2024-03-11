import * as path from "std/path";
import * as fs from "std/fs";
import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "./CollieRepository.ts";

export interface CollieConfigProperties {
  foundation?: string;
  colliehubVersion?: string;
}

export class CollieConfig {
  constructor(
    private readonly repo: CollieRepository,
    private readonly logger: Logger,
  ) {
    this.configFilePath = this.repo.resolvePath(".collie/config.json");
    this.properties = this.loadFromDisk();
  }

  private configFilePath: string;
  private properties: CollieConfigProperties;

  getProperty(property: keyof CollieConfigProperties) {
    const value = this.properties[property];
    if (value) {
      this.logger.verbose(
        () => `loaded ${property}="${value}" from ${this.configFilePath}`,
      );
    }
    return value;
  }

  async setProperty(
    property: keyof CollieConfigProperties,
    value: string,
  ) {
    this.properties[property] = value;
    await this.saveToDisk();
    this.logger.progress(
      `saved ${property}="${value}" to ${this.configFilePath}`,
    );
  }

  private loadFromDisk(): CollieConfigProperties {
    try {
      return JSON.parse(
        Deno.readTextFileSync(this.configFilePath),
      ) as CollieConfigProperties;
    } catch (e) {
      if (e.name == "NotFound") {
        this.logger.verbose(
          () => `No collie config file found under ${this.configFilePath}`,
        );
      } else {
        this.logger.error(
          `${this.configFilePath} is not a valid collie config file`,
        );
      }
      return { foundation: undefined };
    }
  }

  private async saveToDisk() {
    await fs.ensureDir(path.dirname(this.configFilePath));

    await Deno.writeTextFile(
      this.configFilePath,
      JSON.stringify(this.properties),
    );
  }
}
