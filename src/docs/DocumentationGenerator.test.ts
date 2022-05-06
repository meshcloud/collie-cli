import { kitModuleSorter } from "./DocumentationGenerator.ts";
import { assertEquals } from "../dev-deps.ts";
import { KitModuleDependency } from "../kit/KitDependencyAnalyzer.ts";

Deno.test("kitModuleSorter alwas sorts boostrap modules first", () => {
  const modules: KitModuleDependency[] = [
    {
      sourcePath: "platform/y",
      kitModulePath: "kit/y",
      kitModuleOutputPath: "platform/y/output.md",
    },
    {
      sourcePath: "platform/x",
      kitModulePath: "kit/x",
      kitModuleOutputPath: "platform/x/output.md",
    },
    {
      sourcePath: "platform/bootstrap",
      kitModulePath: "kit/bootstrap",
      kitModuleOutputPath: "platform/bootstrap/output.md",
    },
  ];

  const result = modules.sort(kitModuleSorter).map((x) => x.kitModulePath);
  assertEquals(result, ["kit/bootstrap", "kit/x", "kit/y"]);
});

import { assertSnapshot } from "https://deno.land/std@0.136.0/testing/snapshot.ts";

Deno.test("The generated output matches the snapshot", async (t) => {
  const output = "generateComplexStuff();";
  await assertSnapshot(t, output);
});
