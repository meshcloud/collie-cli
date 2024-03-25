import { validateIsPrefixedId } from "./validation.ts";
import { assertEquals } from "std/assert";

Deno.test("non-prefixed ids fail", () => {
  const result = validateIsPrefixedId("abc");
  assertEquals(result, false);
});

Deno.test("prefixed ids pass", () => {
  const result = validateIsPrefixedId("abc/123");
  assertEquals(result, true);
});

Deno.test("prefixed ids with paths pass", () => {
  const result = validateIsPrefixedId("abc/123/xyz");
  assertEquals(result, true);
});
