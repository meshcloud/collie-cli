import * as fs from "std/fs";
import * as path from "std/path";
import { Logger } from "../cli/Logger.ts";

import { loadConfig } from "../config/config.model.ts";
import { moment } from "../deps.ts";
import { IoError } from "../errors.ts";
import { parseJsonWithLog } from "../json.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { Meta } from "./meta.ts";

export class MeshTenantRepository {
  private readonly metaPath: string;

  constructor(
    private readonly dbDirectory: string,
    private readonly logger: Logger,
  ) {
    if (dbDirectory.endsWith("/")) {
      throw new IoError(
        `dbDirectory must not end with a slash: ${dbDirectory}`,
      );
    }

    this.metaPath = path.join(dbDirectory, ".meta.json");
  }

  async clearTenantCosts() {
    const cachedTenants = await this.loadTenants();

    cachedTenants.forEach((t) => {
      t.costs = [];
      this.save(t);
    });
  }

  async isTenantCollectionValid(): Promise<boolean> {
    const meta = await this.loadMeta();

    if (!meta) {
      return false;
    }

    return this.isCacheEvicted(meta.tenantCollection.lastCollection);
  }

  public async isIamCollectionValid(): Promise<boolean> {
    const meta = await this.loadMeta();
    if (meta === null || !meta.iamCollection) {
      return false;
    }

    return this.isCacheEvicted(meta.iamCollection.lastCollection);
  }

  private isCacheEvicted(lastCollectionDate: string) {
    const now = moment();
    const lastCollection = moment(lastCollectionDate);
    const hoursSinceLastCollection = moment
      .duration(now.diff(lastCollection))
      .asHours();
    const config = loadConfig();

    console.debug(
      `Hours since last collection: ${hoursSinceLastCollection}, hours until eviction: ${config.cache.evictionDelayHrs}`,
    );

    return hoursSinceLastCollection <= config.cache.evictionDelayHrs;
  }

  clearAll(): void {
    fs.emptyDir(this.dbDirectory);
  }

  async loadOrBuildMeta(): Promise<Meta> {
    return (
      (await this.loadMeta()) || {
        version: 1,
        tenantCollection: {
          lastCollection: new Date().toUTCString(),
        },
      }
    );
  }

  async loadMeta(): Promise<Meta | null> {
    try {
      const metaFile = await Deno.readTextFile(this.metaPath);

      return parseJsonWithLog<Meta>(metaFile);
    } catch (error) {
      this.logger.debug(
        (fmt) =>
          `failed to load meta from ${fmt.kitPath(this.metaPath)}: ${error}`,
      );
      // todo should log debug?
      return null;
    }
  }

  async loadTenants(): Promise<MeshTenant[]> {
    const tenants = [];
    try {
      for await (
        const file of fs.expandGlob("*.collie.json", {
          root: this.dbDirectory,
        })
      ) {
        const dataStr = await Deno.readTextFile(file.path);

        // TODO: improve error logging
        try {
          const tenant = parseJsonWithLog<MeshTenant>(dataStr);
          tenants.push(tenant);
        } catch (_) {
          console.debug("Invalid tenant JSON:\n" + dataStr);
          throw new IoError(
            `Invalid JSON in tenant file ${file}. Please clear cache to fix this.`,
          );
        }
      }
    } catch (e) {
      throw new IoError(e);
    }

    return tenants;
  }

  async save(tenant: MeshTenant) {
    const tenantPath = path.join(
      this.dbDirectory,
      `${tenant.platformTenantId}.collie.json`,
    );

    this.logger.debug((fmt) => `saving meshTenant ${fmt.kitPath(tenantPath)}`);

    await Deno.mkdir(this.dbDirectory, { recursive: true });

    const data = JSON.stringify(tenant, null, 2);

    await Deno.writeTextFile(tenantPath, data);
  }

  async saveMeta(meta: Meta) {
    this.logger.debug((fmt) => `saving meta ${fmt.kitPath(this.metaPath)}`);

    await Deno.mkdir(this.dbDirectory, { recursive: true });

    const data = JSON.stringify(meta, null, 2);
    await Deno.writeTextFile(this.metaPath, data);
  }
}
