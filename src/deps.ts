// NOTE: as usage of dependencies in collie grows, we found import_map.json to be a better fit for managing our
// dependencies and cleanly importing them where they are used. When modifying a dependency here, consider moving it
// over to import_map.json instead

// this file is a central collection of our dependencies
// this is a deno best practice https://deno.land/manual@v1.7.4/examples/manage_dependencies
//
// for  discussion of the performance implications (and why this doesn't matter much for this _app_) see https://github.com/denoland/deno/issues/6194
/**
 * 3rd party deps
 */

// cliffy
export {
  Command,
  CompletionsCommand,
  EnumType,
  Type,
} from "https://deno.land/x/cliffy@v0.22.2/command/mod.ts";
export type { ITypeInfo } from "https://deno.land/x/cliffy@v0.22.2/command/mod.ts";
export { Table } from "https://deno.land/x/cliffy@v0.22.2/table/mod.ts";
export {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.22.2/prompt/mod.ts";
export {
  GithubProvider,
  UpgradeCommand,
} from "https://deno.land/x/cliffy@v0.22.2/command/upgrade/mod.ts";

// other
export { writeCSV } from "https://deno.land/x/csv@v0.5.1/mod.ts";
export { moment } from "https://deno.land/x/deno_moment@v1.1.2/mod.ts";
export { open } from "https://deno.land/x/opener@v1.0.1/mod.ts";
export { makeRunWithLimit } from "https://deno.land/x/run_with_limit@v1.0.1/mod.ts";
export { clone } from "https://deno.land/x/object_clone@1.1.0/mod.ts";
export { equal } from "https://deno.land/x/equal@v1.5.0/mod.ts";
