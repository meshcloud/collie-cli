import { assertEquals } from "std/testing/assert";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";
import { InstallationStatus } from "../CliInstallationStatus.ts";
import { AzCliDetector } from "./AzCliDetector.ts";

Deno.test("detects az cli version correct", async () => {
  const runner = new StubProcessRunner();
  const sut = new AzCliDetector(runner);

  runner.setupResult({
    stdout: `{
      "azure-cli": "2.34.1",
      "azure-cli-core": "2.34.1",
      "azure-cli-telemetry": "1.0.6",
      "extensions": {
        "account": "0.2.2",
        "aro": "1.0.0",
        "costmanagement": "0.1.1",
        "interactive": "0.4.5"
      }
    }`,
    stderr:
      `You have 2 updates available. Consider updating your CLI installation with 'az upgrade'

Please let us know how we are doing: https://aka.ms/azureclihats
and let us know if you're interested in trying out our newest features: https://aka.ms/CLIUXstudy
`,
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.Installed);
  if (result.status == InstallationStatus.Installed) {
    assertEquals(result.version, "2.34.1");
  }
});
