import { Config, ConnectedConfigKey } from "./config.model.ts";

export interface PostPlatformConfigHook {
  isExecutable(platform: ConnectedConfigKey): boolean;
  executeConnected(config: Config): void;
  executeDisconnected(config: Config): void;
}
