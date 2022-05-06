// this file is a central collection of our dependencies
// this is a deno best practice https://deno.land/manual@v1.7.4/examples/manage_dependencies
// for  discussion of the performance implications (and why this doesn't matter much for this _app_) see https://github.com/denoland/deno/issues/6194

export {
  assert,
  assertEquals,
  assertMatch,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@0.136.0/testing/asserts.ts";
export { delay } from "https://deno.land/std@0.136.0/async/mod.ts";
