import { GitCliDetector } from "./GitCliDetector.ts";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";
import { assertEquals } from "std/testing/assert";

Deno.test(
  "can parse version numbers",
  () => {
    const sut = new GitCliDetector(new StubProcessRunner());

    const tests = [
      ["git version 2.19.0", "2.19.0"],
      ["git version 2.19.0.windows.1", "2.19.0"],
    ];

    tests.forEach(([output, expected]) => {
      const actual = sut.parseVersion(output);
      assertEquals(actual, expected);
    });
  },
);
