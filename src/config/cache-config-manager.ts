import { MeshError } from "../errors.ts";
import { CacheConfig, loadConfig, writeConfig } from "./config.model.ts";

export class CacheConfigManager {
  private readonly cacheConfig: CacheConfig;

  constructor() {
    this.cacheConfig = loadConfig().cache;
  }

  getConfigValue(key: string): string {
    if (!(key in this.cacheConfig)) {
      throw new MeshError(
        `Config key ${key} does not exist. Available: ${
          Object.keys(this.cacheConfig)
        }`,
      );
    }

    return this.cacheConfig[(key as keyof CacheConfig)].toString();
  }

  setConfigValue(key: string, value: string) {
    if (key === "evictionDelayHrs") {
      const delayHrs = parseInt(value);
      this.cacheConfig.evictionDelayHrs = delayHrs;
    } else {
      throw new MeshError(
        `Config key ${key} does not exist. Available: ${
          Object.keys(this.cacheConfig)
        }`,
      );
    }

    const updatedConfig = loadConfig();
    updatedConfig.cache = this.cacheConfig;
    writeConfig(updatedConfig);
  }
}
