import { CliDetectionResult, ICliDetector } from "../CliDetector.ts";
import { InstallationStatus } from "/api/CliInstallationStatus.ts";
import { CliInstallationStatusError } from "/errors.ts";
import { OpenTofuCliDetector } from "./OpenTofuCliDetector.ts";
import { TerraformCliDetector } from "./TerraformCliDetector.ts";

export class TofuOrTerraformCliDetector implements ICliDetector {
  constructor(
    private readonly tofu: OpenTofuCliDetector,
    private readonly terraform: TerraformCliDetector,
  ) {
  }
  async detect(): Promise<CliDetectionResult> {
    const tofuResult = await this.tofu.detect();
    if (tofuResult.status === InstallationStatus.Installed) {
      return tofuResult;
    }

    return this.terraform.detect();
  }

  async tryRaiseInstallationStatusError() {
    const { status } = await this.detect();
    switch (status) {
      case InstallationStatus.Installed:
        break;
      case InstallationStatus.NotInstalled:
      case InstallationStatus.UnsupportedVersion:
        throw new CliInstallationStatusError("tofu or terraform", status);
    }
  }
}
