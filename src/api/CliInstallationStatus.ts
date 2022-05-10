export enum InstallationStatus {
  Installed,
  UnsupportedVersion,
  NotInstalled,
}

export interface CliInstallationStatus {
  cli: string;
  status: InstallationStatus;
}
