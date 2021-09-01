import { CacheConfigManager } from "../config/cache-config-manager.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { Command } from "../deps.ts";
import { CmdGlobalOptions } from "./cmd-options.ts";

export function registerCacheCommand(program: Command) {
  const cacheCmd = new Command()
    .description("Control you cached tenant state.")
    .action(() => cacheCmd.showHelp());
  program.command("cache", cacheCmd);

  const clearCache = new Command()
    .description(
      "Clears the local cache. All data will be re-fetched from the cloud platforms which will take a while.",
    )
    .action(clearCacheAction);

  const setEvictionConfig = new Command()
    .description(
      "Sets cache eviction delay in hours.",
    )
    .arguments("<value:string>")
    .action(setConfigAction);

  const getEvictionConfig = new Command()
    .description(
      "Gets cache eviction delay.",
    )
    .action(getConfigAction);

  cacheCmd
    .command("clear", clearCache)
    .command("set-eviction-delay", setEvictionConfig)
    .command("get-eviction-delay", getEvictionConfig);
}

function setConfigAction(
  _: CmdGlobalOptions,
  value: string,
) {
  const cacheConfigSetter = new CacheConfigManager();
  cacheConfigSetter.setConfigValue("evictionDelayHrs", value);
  console.log(`Set cache eviction delay: ${value} hrs`);
}

function getConfigAction(
  _: CmdGlobalOptions,
) {
  const cacheConfigSetter = new CacheConfigManager();
  const value = cacheConfigSetter.getConfigValue("evictionDelayHrs");
  console.log(`Cache eviction delay: ${value} hrs`);
}

function clearCacheAction() {
  const repository = newMeshTenantRepository();
  repository.clearAll();
  console.log("Cache was cleared");
}
