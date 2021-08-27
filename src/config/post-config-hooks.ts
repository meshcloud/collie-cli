import { ShellRunner } from "../process/shell-runner.ts";
import { AwsPostPlatformConfigHook } from "./aws-post-config.ts";
import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";

export function buildConfigHooks(): PostPlatformConfigHook[] {
  return [
    new AwsPostPlatformConfigHook(new ShellRunner()),
  ];
}
