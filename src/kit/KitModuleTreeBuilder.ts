import * as colors from "std/fmt/colors";
import * as path from "std/path";
import * as collections from "std/collections";

import { FoundationDependencies } from "./KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "./KitModuleRepository.ts";
import { insert, Tree } from "/model/tree.ts";

export interface KitModuleInfo {
  name: string;
  usedByPlatforms: string[];
}

export class KitModuleTreeBuilder {
  constructor(private readonly modules: KitModuleRepository) {}

  build(dependencies: FoundationDependencies[]): Tree<KitModuleInfo> {
    const entries = dependencies.flatMap((f) =>
      f.platforms.flatMap((p) =>
        p.modules.flatMap((m) => ({
          module: m.kitModulePath,
          platform: `foundations/${f.foundation}/platforms/${p.platform.id}`,
        }))
      )
    );

    const dependeciesByPath = collections.groupBy(entries, (x) => x.module);

    const tree: Tree<KitModuleInfo> = {};

    this.modules.all.forEach((x) => {
      const components = x.id.split(path.sep);
      const info = {
        name: x.kitModule.name,
        usedByPlatforms: dependeciesByPath[x.id]?.map((p) =>
          colors.green(p.platform)
        ).sort() || [],
      };
      insert(tree, components, info);
    });

    return tree;
  }
}
