import { configPath, loadConfig } from "../config/config.model.ts";
import { emptyDir, ensureDirSync, existsSync, log, moment } from "../deps.ts";
import { MeshError } from "../errors.ts";
import { parseJsonWithLog } from "../json.ts";
import { MeshTenant } from "../mesh/mesh-tenant.model.ts";
import { Meta } from "./meta.ts";

export class IoError extends MeshError {
  constructor(message: string) {
    super(message);
  }
}

export class MeshTenantRepository {
  private readonly metaFile = "/.meta.json";
  private readonly metaPath: string;

  constructor(
    private readonly dbDirectory: string,
  ) {
    if (dbDirectory.endsWith("/")) {
      throw new IoError(
        `dbDirectory must not end with a slash: ${dbDirectory}`,
      );
    }

    this.metaPath = dbDirectory + this.metaFile;
    this.initDirectory();
  }

  private writeFile(path: string, text: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    Deno.writeFileSync(path, data);
  }

  private async readFile(path: string): Promise<string> {
    const decoder = new TextDecoder();
    const data = await Deno.readFile(path);

    return decoder.decode(data);
  }

  private initDirectory() {
    log.debug(
      `Creating database directory ${this.dbDirectory} if it does not exist.`,
    );
    ensureDirSync(this.dbDirectory);
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
    if (meta === null) {
      return false;
    }

    return this.isCacheEvicted(meta.tenantCollection.lastCollection);
  }

  async isIamCollectionValid(): Promise<boolean> {
    const meta = await this.loadMeta();
    if (meta === null || !meta.iamCollection) {
      return false;
    }

    return this.isCacheEvicted(meta.iamCollection.lastCollection);
  }

  private isCacheEvicted(lastCollectionDate: string) {
    const now = moment();
    const lastCollection = moment(lastCollectionDate);
    const hoursSinceLastCollection = moment.duration(now.diff(lastCollection))
      .asHours();
    const config = loadConfig();

    log.debug(
      `Hours since last collection: ${hoursSinceLastCollection}, hours until eviction: ${config.cache.evictionDelayHrs}`,
    );

    return hoursSinceLastCollection <= config.cache.evictionDelayHrs;
  }

  clearAll(): void {
    emptyDir(this.dbDirectory);
  }

  async loadOrBuildMeta(): Promise<Meta> {
    let meta = await this.loadMeta();
    if (meta === null) {
      meta = this.newMeta();
    }
    return meta;
  }

  async loadMeta(): Promise<Meta | null> {
    if (existsSync(this.metaPath)) {
      const metaFile = await this.readFile(this.dbDirectory + this.metaFile);

      return parseJsonWithLog<Meta>(metaFile);
    } else {
      return null;
    }
  }

  newMeta(): Meta {
    return {
      version: 1,
      tenantCollection: {
        lastCollection: new Date().toUTCString(),
      },
    };
  }

  private async getTenantFilePaths(): Promise<string[]> {
    const fileNames: string[] = [];

    try {
      for await (const dirEntry of Deno.readDir(this.dbDirectory)) {
        if (dirEntry.isFile) {
          fileNames.push(dirEntry.name);
        }
      }
    } catch (e) {
      throw new IoError(e);
    }

    // Filter for all the tenant files and read them.
    const tenantFilePaths = fileNames
      .filter((f) => f.startsWith("tenant-"))
      .map((f) => this.dbDirectory + "/" + f);

    return tenantFilePaths;
  }

  async loadTenants(): Promise<MeshTenant[]> {
    const tenantFileNames = await this.getTenantFilePaths();

    const tenants = [];
    try {
      for await (const tenantFile of tenantFileNames) {
        const dataStr = await this.readFile(tenantFile);

        try {
          const tenant = parseJsonWithLog<MeshTenant>(dataStr);
          tenants.push(tenant);
        } catch (_) {
          log.debug("Invalid tenant JSON:\n" + dataStr);
          throw new IoError(
            `Invalid JSON in tenant file ${tenantFile}. Please clear cache to fix this.`,
          );
        }
      }
    } catch (e) {
      throw new IoError(e);
    }

    return tenants;
  }

  save(tenant: MeshTenant) {
    const filename =
      `/tenant-${tenant.platform}.${tenant.platformTenantName}-${tenant.platformTenantId}.json`;
    const path = this.dbDirectory + filename;

    log.debug(`Writing MeshTenant ${tenant.platformTenantName} to: ${path}`);

    const data = JSON.stringify(tenant, null, 2);
    this.writeFile(path, data);
  }

  saveMeta(meta: Meta) {
    const data = JSON.stringify(meta, null, 2);
    this.writeFile(this.metaPath, data);
  }
}

/**
 * Factory function. No need for full fledged class.
 */
export function newMeshTenantRepository(): MeshTenantRepository {
  return new MeshTenantRepository(configPath + "/tenants");
}
