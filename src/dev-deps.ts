// this file is a central collection of our dependencies
// this is a deno best practice https://deno.land/manual@v1.7.4/examples/manage_dependencies
// for  discussion of the performance implications (and why this doesn't matter much for this _app_) see https://github.com/denoland/deno/issues/6194

export * from "https://deno.land/x/mock@v0.10.0/mod.ts";
export { stub } from "https://deno.land/x/mock@v0.9.5/stub.ts";
export {
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@0.98.0/testing/asserts.ts";