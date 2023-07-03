import { assertEquals } from "std/testing/assert";
import { LiteralArgsParser } from "./LiteralArgsParser.ts";

Deno.test("ignores all positional args", () => {
  const result = LiteralArgsParser.parse(["a", "b"]);
  assertEquals(result, []);
});

Deno.test("ignores options", () => {
  const result = LiteralArgsParser.parse(["--a", "b"]);
  assertEquals(result, []);
});

Deno.test("parses empty args", () => {
  const result = LiteralArgsParser.parse(["a", "--foo", "bar", "--"]);
  assertEquals(result, []);
});

Deno.test("parses args", () => {
  const result = LiteralArgsParser.parse([
    "a",
    "--foo",
    "bar",
    "--",
    "literalA",
    "literalB",
  ]);
  assertEquals(result, ["literalA", "literalB"]);
});
