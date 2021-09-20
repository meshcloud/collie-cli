import { ShellRunner } from "../process/shell-runner.ts";
import { AwsPostPlatformConfigHook } from "./aws-post-config.ts";
import { PostPlatformConfigHook } from "./post-platform-config-hook.ts";
import { GcpPostPlatformConfigHook } from "./gcp-post-config.ts";

export function buildConfigHooks(): PostPlatformConfigHook[] {
  // TODO: we are not using the Verbose/Loader ShellRunner here. might be nicer to use either those ones
  // depending on the flags the user supplied.
  const shellRunner = new ShellRunner();

  return [
    new AwsPostPlatformConfigHook(shellRunner),
    new GcpPostPlatformConfigHook(shellRunner),
  ];
}
