import { ShellRunner } from "../process/shell-runner.ts";
import { MultiMeshAdapter } from "./multi-mesh-adapter.ts";
import { Config } from "../config/config.model.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { VerboseShellRunner } from "../process/verbose-shell-runner.ts";
import { LoaderShellRunner } from "../process/loader-shell-runner.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { CachingMeshAdapterDecorator } from "./caching-mesh-adapter-decorator.ts";
import { isatty, TTY } from "../commands/tty.ts";
import { StatsMeshAdapterDecorator } from "./stats-mesh-adapter-decorator.ts";
import { QueryStatistics } from "./query-statistics.ts";
import { isWindows } from "../os.ts";

/**
 * Should consume the cli configuration in order to build the
 * proper adapter.
 *
 * TODO: remove all usages
 */
export class MeshAdapterFactory {
  constructor(private readonly config: Config) {}

  buildMeshAdapter(
    options: CmdGlobalOptions,
    queryStats?: QueryStatistics,
  ): MeshAdapter {
    let shellRunner = new ShellRunner();

    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else if (isatty && !isWindows) {
      shellRunner = new LoaderShellRunner(shellRunner, new TTY());
    }

    const adapters: MeshAdapter[] = [];

    if (this.config.connected.AWS) {
      throw new Error("AWS no longer supported in legacy MeshAdapterFactory");
    }

    if (this.config.connected.Azure) {
      throw new Error("Azure no longer supported in legacy MeshAdapterFactory");
    }

    if (this.config.connected.GCP) {
      throw new Error("GCP no longer supported in legacy MeshAdapterFactory");
    }

    // There are multiple ways of doing it. Currently we only fetch everything or nothing, which is easier I guess.
    // we could also split every platform into an individual repository folder and perform fetching and caching on a per-platform
    // basis. For now we go with the easier part.
    const tenantRepository = newMeshTenantRepository();

    const cachingMeshAdapter = new CachingMeshAdapterDecorator(
      tenantRepository,
      new MultiMeshAdapter(adapters),
    );

    if (queryStats) {
      return new StatsMeshAdapterDecorator(
        cachingMeshAdapter,
        "cache",
        0,
        queryStats,
      );
    }

    return cachingMeshAdapter;
  }
}
