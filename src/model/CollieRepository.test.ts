import { assertEquals } from "std/testing/assert";
import { CollieRepository } from "./CollieRepository.ts";

Deno.test("relativePath calculates paths relative to repository root", () => {
  const sut = new CollieRepository("/tmp/test");

  const result = sut.relativePath("/tmp/test/123");
  assertEquals(result, "123");
});
