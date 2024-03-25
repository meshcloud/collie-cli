import { assertEquals } from "std/assert";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";
import { InstallationStatus } from "../CliInstallationStatus.ts";
import { NpmCliDetector } from "./NpmCliDetector.ts";

Deno.test("detects npm cli version correct", async () => {
  const runner = new StubProcessRunner();
  const sut = new NpmCliDetector(runner);

  runner.setupResult({
    stdout: "8.19.2",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.Installed);
  if (result.status == InstallationStatus.Installed) {
    assertEquals(result.version, "8.19.2");
  }
});

Deno.test("detects npm cli version correct also for npm > 10", async () => {
  const runner = new StubProcessRunner();
  const sut = new NpmCliDetector(runner);

  runner.setupResult({
    stdout: "10.1.2",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.Installed);
  if (result.status == InstallationStatus.Installed) {
    assertEquals(result.version, "10.1.2");
  }
});

Deno.test("detects unsupported npm cli versions", async () => {
  const runner = new StubProcessRunner();
  const sut = new NpmCliDetector(runner);

  runner.setupResult({
    stdout: "6.1.2",
  });

  const result = await sut.detect();

  assertEquals(result.status, InstallationStatus.UnsupportedVersion);
});
