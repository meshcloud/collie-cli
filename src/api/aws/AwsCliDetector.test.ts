import { assertEquals } from "std/assert";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";
import { InstallationStatus } from "../CliInstallationStatus.ts";
import { AwsCliDetector } from "./AwsCliDetector.ts";

Deno.test("detects aws cli version correct", async () => {
  const runner = new StubProcessRunner();
  const sut = new AwsCliDetector(runner);

  runner.setupResult({
    stdout: "aws-cli/2.2.20 Python/3.8.8 Darwin/20.5.0 exe/x86_64 prompt/off",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.Installed);
  if (result.status == InstallationStatus.Installed) {
    assertEquals(result.version, "2.2.20");
  }
});

Deno.test("detects aws cli version incorrect", async () => {
  const runner = new StubProcessRunner();
  const sut = new AwsCliDetector(runner);

  runner.setupResult({
    stdout: "aws-cli/1.2.9 Python/3.4.3 Linux/3.13.0-85-generic",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.UnsupportedVersion);
});

Deno.test("detects aws cli not installed", async () => {
  const runner = new StubProcessRunner();
  const sut = new AwsCliDetector(runner);

  runner.setupResult({
    status: {
      success: false,
      code: 127,
    },
    stdout: "aws: command not found",
    stderr: "",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.NotInstalled);
});
