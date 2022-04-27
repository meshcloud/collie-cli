import { PlatformCommandInstallationStatus } from "../cli-detector.ts";

export interface CliInstallationStatus {
  cli: string;
  status: PlatformCommandInstallationStatus;
}

export interface CliFacade {
  verifyCliInstalled(): Promise<CliInstallationStatus>;
}
