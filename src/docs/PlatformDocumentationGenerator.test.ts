import { assertEquals } from "../dev-deps.ts";
import { KitModuleDependency } from "../kit/KitDependencyAnalyzer.ts";
import { kitModuleSorter } from "./PlatformDocumentationGenerator.ts";

Deno.test("kitModuleSorter alwas sorts boostrap modules first", () => {
  const modules: KitModuleDependency[] = [
    {
      kitModuleId: "y",
      kitModulePath: "kit/y",
      sourcePath: "platform/y",
      kitModuleOutputPath: "platform/y/output.md",
    },
    {
      kitModuleId: "x",
      sourcePath: "platform/x",
      kitModulePath: "kit/x",
      kitModuleOutputPath: "platform/x/output.md",
    },
    {
      kitModuleId: "bootstrap",
      kitModulePath: "kit/bootstrap",
      sourcePath: "platform/bootstrap",
      kitModuleOutputPath: "platform/bootstrap/output.md",
    },
  ];

  const result = modules.sort(kitModuleSorter).map((x) => x.kitModulePath);
  assertEquals(result, ["kit/bootstrap", "kit/x", "kit/y"]);
});
