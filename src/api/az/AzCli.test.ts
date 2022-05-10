import { assertEquals } from "../../dev-deps.ts";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";
import { InstallationStatus } from "../CliInstallationStatus.ts";
import { AzCli } from "./AzCli.ts";

Deno.test("detects az cli version correct", async () => {
  const runner = new StubProcessRunner();
  const sut = new AzCli(runner);

  runner.setupResult({
    stdout: `azure-cli                         2.14.2 *

core                              2.14.2 *
telemetry                          1.0.6

Extensions:
aro                                1.0.0

Python location '/nix/store/gj2s9dc8zlnrblcyls8jnyx315zrbfj8-python3-3.7.9/bin/python3.7'
Extensions directory '/Users/user/.azure/cliextensions'

Python (Darwin) 3.7.9 (default, Nov  9 2020, 18:12:58) 
[Clang 7.1.0 (tags/RELEASE_710/final)]

Legal docs and information: aka.ms/AzureCliLegal`,
    stderr:
      `You have 2 updates available. Consider updating your CLI installation with 'az upgrade'

Please let us know how we are doing: https://aka.ms/azureclihats
and let us know if you're interested in trying out our newest features: https://aka.ms/CLIUXstudy
`,
  });

  const result = await sut.verifyCliInstalled();

  assertEquals(result.status, InstallationStatus.Installed);
});
