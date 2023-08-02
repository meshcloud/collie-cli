import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "./CollieRepository.ts";

export interface CollieConfigProperties {
  foundation?: string;
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

  getProperty(property: string) {
    const value = this.properties["foundation"];
    if (value) {
      this.logger.verbose(
        () => `loaded ${property}="${value}" from ${this.configFilePath}`,
      );
    }
    return value;
  }

  async setProperty(
    property: "foundation",
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
    await Deno.writeTextFile(
      this.configFilePath,
      JSON.stringify(this.properties),
    );
  }
}
