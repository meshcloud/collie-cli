export enum InstallationStatus {
  Installed,
  UnsupportedVersion,
  NotInstalled,
}

export interface CliInstallationStatus {
  cli: string;
  status: InstallationStatus;
}

export interface CliFacade {
  verifyCliInstalled(): Promise<CliInstallationStatus>;
}
