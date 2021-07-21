import {
  CliDetector,
  PlatformCommandInstallationStatus,
} from "./cli-detector.ts";
import { PlatformCommand } from "./config/config.model.ts";
import { assertEquals } from "./dev-deps.ts";

Deno.test("detects aws cli version correct", () => {
  const sut = new CliDetector();
  const out = {
    code: 0,
    stdout: "aws-cli/2.2.20 Python/3.8.8 Darwin/20.5.0 exe/x86_64 prompt/off",
    stderr: "",
  };

  const result = sut.determineInstallationStatus(PlatformCommand.AWS, out);

  assertEquals(result, PlatformCommandInstallationStatus.Installed);
});

Deno.test("detects aws cli version incorrect", () => {
  const sut = new CliDetector();
  const out = {
    code: 0,
    stdout: "aws-cli/1.2.9 Python/3.4.3 Linux/3.13.0-85-generic",
    stderr: "",
  };

  const result = sut.determineInstallationStatus(PlatformCommand.AWS, out);

  assertEquals(result, PlatformCommandInstallationStatus.UnsupportedVersion);
});

Deno.test("detects aws cli not installed", () => {
  const sut = new CliDetector();
  const out = {
    code: 127,
    stdout: " aws: command not found",
    stderr: "",
  };

  const result = sut.determineInstallationStatus(PlatformCommand.AWS, out);

  assertEquals(result, PlatformCommandInstallationStatus.NotInstalled);
});

Deno.test("detects gcloud cli version correct", () => {
  const sut = new CliDetector();
  const out = {
    code: 0,
    stdout: `Google Cloud SDK 315.0.0
bq 2.0.62
core 2020.10.16
gsutil 4.53


To take a quick anonymous survey, run:
  $ gcloud survey
    `,
    stderr: "",
  };

  const result = sut.determineInstallationStatus(PlatformCommand.GCP, out);

  assertEquals(result, PlatformCommandInstallationStatus.Installed);
});

Deno.test("detects az cli version correct", () => {
  const sut = new CliDetector();
  const out = {
    code: 0,
    stdout: `az --version
azure-cli                         2.14.2 *

core                              2.14.2 *
telemetry                          1.0.6

Extensions:
aro                                1.0.0

Python location '/nix/store/gj2s9dc8zlnrblcyls8jnyx315zrbfj8-python3-3.7.9/bin/python3.7'
Extensions directory '/Users/user/.azure/cliextensions'

Python (Darwin) 3.7.9 (default, Nov  9 2020, 18:12:58) 
[Clang 7.1.0 (tags/RELEASE_710/final)]

Legal docs and information: aka.ms/AzureCliLegal


You have 2 updates available. Consider updating your CLI installation with 'az upgrade'

Please let us know how we are doing: https://aka.ms/azureclihats
and let us know if you're interested in trying out our newest features: https://aka.ms/CLIUXstudy
`,
    stderr: "",
  };

  const result = sut.determineInstallationStatus(PlatformCommand.Azure, out);

  assertEquals(result, PlatformCommandInstallationStatus.Installed);
});
