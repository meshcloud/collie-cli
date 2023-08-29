import { assertEquals, assertNotEquals } from "std/testing/assert";
import { CollieRepository } from "./CollieRepository.ts";

Deno.test("relativePath calculates paths relative to repository root", () => {
  const sut = CollieRepository.uninitialized("/tmp/test");

  const result = sut.relativePath("/tmp/test/123");
  assertEquals(result, "123");
});

Deno.test("relativePath does not work with paths that are already relative", () => {
  const sut = CollieRepository.uninitialized("/tmp/test");

  const result = sut.relativePath("123");
  assertNotEquals(result, "123");
});
