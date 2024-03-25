import { assertEquals } from "std/assert";
import { PlatformModuleType } from "./PlatformModuleType.ts";
import * as path from "std/path";

Deno.test("parseModuleId parses simple ids", () => {
  const modulePath = path.join(
    "Users",
    "foundations",
    "f",
    "platforms",
    "p",
    "foo",
    "terragrunt.hcl",
  );

  const result = PlatformModuleType.parseModuleId(modulePath);

  assertEquals(result, "foo");
});

Deno.test("parseModuleId parses structured ids", () => {
  const modulePath = path.join(
    "Users",
    "foundations",
    "f",
    "platforms",
    "p",
    "foo",
    "bar",
    "terragrunt.hcl",
  );

  const result = PlatformModuleType.parseModuleId(modulePath);

  assertEquals(result, "foo/bar");
});
