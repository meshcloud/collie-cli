// this file is a central collection of our dependencies
// this is a deno best practice https://deno.land/manual@v1.7.4/examples/manage_dependencies
// for  discussion of the performance implications (and why this doesn't matter much for this _app_) see https://github.com/denoland/deno/issues/6194

/**
 * 3rd party deps
 */

// std
export {
  emptyDir,
  ensureDir,
  ensureDirSync,
  exists,
  existsSync,
} from "https://deno.land/std@0.116.0/fs/mod.ts";
export * as path from "https://deno.land/std@0.116.0/path/mod.ts";
export {
  bold,
  brightBlue,
  dim,
  green,
  italic,
  red,
  yellow,
} from "https://deno.land/std@0.116.0/fmt/colors.ts";
export { readLines } from "https://deno.land/std@0.116.0/io/bufio.ts";
export { stringify as yamlStringify } from "https://deno.land/std@0.116.0/encoding/yaml.ts";

// cliffy
export {
  Command,
  CompletionsCommand,
  EnumType,
  Type,
} from "https://deno.land/x/cliffy@v0.20.1/command/mod.ts";
export type { ITypeInfo } from "https://deno.land/x/cliffy@v0.20.1/command/mod.ts";
export { Cell, Table } from "https://deno.land/x/cliffy@v0.20.1/table/mod.ts";
export {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.20.1/prompt/mod.ts";
export {
  GithubProvider,
  UpgradeCommand,
} from "https://deno.land/x/cliffy@v0.20.1/command/upgrade/mod.ts";

// other
export * as Progress from "https://deno.land/x/progress@v1.2.3/mod.ts";
export { Big } from "https://deno.land/x/math@v1.1.0/mod.ts";
export { writeCSV } from "https://deno.land/x/csv@v0.5.1/mod.ts";
export { moment } from "https://deno.land/x/deno_moment@v1.1.2/mod.ts";
export { open } from "https://deno.land/x/opener@v1.0.1/mod.ts";
export { makeRunWithLimit } from "https://deno.land/x/run_with_limit@v1.0.1/mod.ts";
export { clone } from "https://deno.land/x/object_clone@1.1.0/mod.ts";
export { equal } from "https://deno.land/x/equal@v1.5.0/mod.ts";
