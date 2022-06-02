import { assertEquals } from "../../dev-deps.ts";
import { PlatformModuleType } from "./PlatformModuleType.ts";

Deno.test("parseModuleId parses simple ids", () => {
  const path = "/Users/foundations/f/platforms/p/foo/terragrunt.hcl";
  const result = PlatformModuleType.parseModuleId(path);

  assertEquals(result, "foo");
});

Deno.test("parseModuleId parses structured ids", () => {
  const path = "/Users/foundations/f/platforms/p/foo/bar/terragrunt.hcl";
  const result = PlatformModuleType.parseModuleId(path);

  assertEquals(result, "foo/bar");
});
