import { assertEquals } from "../dev-deps.ts";
import { MeshPlatforms } from "./mesh-tenant.model.ts";

Deno.test("get all platforms", () => {
  const expected = ["AWS", "Azure", "GCP"];

  assertEquals(MeshPlatforms, expected);
});
