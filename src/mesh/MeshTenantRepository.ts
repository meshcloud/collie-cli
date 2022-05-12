import * as fs from "std/fs";
import * as path from "std/path";

import { Logger } from "../cli/Logger.ts";
import { IoError } from "../errors.ts";
import { parseJsonWithLog } from "../json.ts";
import { MeshTenant } from "./MeshTenantModel.ts";
import { Meta } from "./Meta.ts";

/**
 * TODO: the cache and the cachingMeshAdapterDecorator have a somewhat unclear split of responsibilities between them
 */
export class MeshTenantRepository {
  private readonly metaPath: string;

  constructor(
    public readonly repoDir: string,
    private readonly logger: Logger,
  ) {
    this.metaPath = path.join(repoDir, ".meta.json");
  }

  async clearAll() {
    await fs.emptyDir(this.repoDir);
  }

  async tryLoadMeta(): Promise<Meta | undefined> {
    try {
      const metaFile = await Deno.readTextFile(this.metaPath);

      return parseJsonWithLog<Meta>(metaFile);
    } catch (error) {
      this.logger.debug(
        (fmt) =>
          `failed to load meta from ${fmt.kitPath(this.metaPath)}: ${error}`,
      );
    }
  }

  async loadTenants(): Promise<MeshTenant[]> {
    const tenants = [];
    try {
      for await (
        const file of fs.expandGlob("*.collie.json", {
          root: this.repoDir,
        })
      ) {
        const json = await Deno.readTextFile(file.path);

        try {
          const tenant = parseJsonWithLog<MeshTenant>(json);
          tenants.push(tenant);
        } catch (_) {
          this.logger.warn(
            (fmt) =>
              `Omitting cached tenant ${
                fmt.kitPath(
                  file.path,
                )
              } due to invalid json. Please clear cache to fix this.`,
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
      this.repoDir,
      `${tenant.platformTenantId}.collie.json`,
    );

    this.logger.debug((fmt) => `saving meshTenant ${fmt.kitPath(tenantPath)}`);

    await Deno.mkdir(this.repoDir, { recursive: true });

    const data = JSON.stringify(tenant, null, 2);

    await Deno.writeTextFile(tenantPath, data);
  }

  async saveMeta(meta: Meta) {
    this.logger.debug((fmt) => `saving meta ${fmt.kitPath(this.metaPath)}`);

    await Deno.mkdir(this.repoDir, { recursive: true });

    const data = JSON.stringify(meta, null, 2);
    await Deno.writeTextFile(this.metaPath, data);
  }
}
