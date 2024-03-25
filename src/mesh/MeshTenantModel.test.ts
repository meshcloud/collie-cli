import { assertEquals } from "std/assert";
import { MeshPlatforms } from "./MeshTenantModel.ts";

Deno.test("get all platforms", () => {
  const expected = ["AWS", "Azure", "GCP"];

  assertEquals(MeshPlatforms, expected);
});
