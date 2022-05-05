import { assertEquals } from "../dev-deps.ts";
import { MeshPlatforms } from "./MeshTenantModel.ts";

Deno.test("get all platforms", () => {
  const expected = ["AWS", "Azure", "GCP"];

  assertEquals(MeshPlatforms, expected);
});
