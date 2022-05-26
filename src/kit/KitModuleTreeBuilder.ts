import * as colors from "std/fmt/colors";
import * as collections from "std/collections";

import { FoundationDependencies } from "./KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "./KitModuleRepository.ts";
import { buildLabeledIdPath, insert, Tree } from "/model/tree.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

export interface KitModuleInfo {
  name: string;
  platforms: string[];
  controls: string[];
}

export class KitModuleTreeBuilder {
  constructor(
    private readonly collie: CollieRepository,
    private readonly modules: KitModuleRepository,
  ) {}

  build(dependencies: FoundationDependencies[]): Tree<KitModuleInfo> {
    const entries = dependencies.flatMap((f) =>
      f.platforms.flatMap((p) =>
        p.modules.flatMap((m) => ({
          module: m.kitModuleId,
          platform: `foundations/${f.foundation}/platforms/${p.platform.id}`,
        }))
      )
    );

    const dependeciesByPath = collections.groupBy(entries, (x) => x.module);

    const tree: Tree<KitModuleInfo> = {};

    this.modules.all.forEach((m) => {
      const label = this.collie.relativePath(m.definitionPath);
      const labeledComponents = buildLabeledIdPath(m.id, label);

      const info = {
        name: m.kitModule.name,
        platforms: dependeciesByPath[m.id]
          ?.map((p) => colors.green(p.platform))
          .sort() || [],
        controls: m.kitModule?.compliance?.map((x) => colors.blue(x.control)) ||
          [],
      };

      insert(tree, labeledComponents, info);
    });

    return tree;
  }
}
