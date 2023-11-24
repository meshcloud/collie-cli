import { assertEquals } from "std/testing/assert";
import { RunAllPlatformModuleOutputCollector } from "./PlatformModuleOutputCollector.ts";

const stdout = `
--- BEGIN COLLIE PLATFORM MODULE OUTPUT: logging ---
foo
123
--- BEGIN COLLIE PLATFORM MODULE OUTPUT: billing ---
bar
xyz`;

Deno.test("can split", () => {
  const result = RunAllPlatformModuleOutputCollector.parseTerragrunt(stdout);

  const expected = [
    { module: "logging", output: "foo\n123" },
    { module: "billing", output: "bar\nxyz" },
  ];

  assertEquals(result, expected);
});
