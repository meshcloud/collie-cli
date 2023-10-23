import { assertEquals } from "std/testing/assert";
import { ComplianceControlParser } from "./ComplianceControlParser.ts";

Deno.test("parsing with POSIX paths", () => {
  const path = "compliance/cfmm/iam/identity-lifecycle-management.md";
  const result = ComplianceControlParser.toId(path);

  assertEquals(result, "cfmm/iam/identity-lifecycle-management");
});

Deno.test("parsing with windows paths", () => {
  const path = "compliance\\cfmm\\iam\\identity-lifecycle-management.md";
  const result = ComplianceControlParser.toId(path);

  assertEquals(result, "cfmm/iam/identity-lifecycle-management");
});
