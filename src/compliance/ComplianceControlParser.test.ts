import { assertEquals } from "std/assert";
import { ComplianceControlParser } from "./ComplianceControlParser.ts";
import { isWindows } from "../os.ts";

Deno.test("parsing with POSIX paths", () => {
  const path = "compliance/cfmm/iam/identity-lifecycle-management.md";
  const result = ComplianceControlParser.toId(path);

  assertEquals(result, "cfmm/iam/identity-lifecycle-management");
});

if (isWindows) {
  Deno.test("parsing with windows paths", () => {
    const path = "compliance\\cfmm\\iam\\identity-lifecycle-management.md";
    const result = ComplianceControlParser.toId(path);

    assertEquals(result, "cfmm/iam/identity-lifecycle-management");
  });
}
