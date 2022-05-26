import * as colors from "std/fmt/colors";
import * as collections from "std/collections";

import { ComplianceControlRepository } from "./ComplianceControlRepository.ts";
import { buildLabeledIdPath, insert, Tree } from "/model/tree.ts";
import { FoundationDependencies } from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

export interface ComplianceControlInfo {
  name: string;
  modules: string[];
  platforms: string[];
}

export class ComplianceControlTreeBuilder {
  constructor(
    private readonly collie: CollieRepository,
    private readonly controls: ComplianceControlRepository,
  ) {}

  build(dependencies: FoundationDependencies[]): Tree<ComplianceControlInfo> {
    const entries = dependencies.flatMap((f) =>
      f.platforms.flatMap((p) =>
        p.modules.flatMap(
          (m) =>
            m.kitModule?.compliance?.flatMap((c) => ({
              control: c.control,
              module: m.kitModulePath,
              platform:
                `foundations/${f.foundation}/platforms/${p.platform.id}`,
            })) || [],
        )
      )
    );

    const dependeciesByPath = collections.groupBy(entries, (x) => x?.control);

    const tree: Tree<ComplianceControlInfo> = {};

    this.controls.all.forEach((x) => {
      const label = this.collie.relativePath(
        this.collie.relativePath(x.definitionPath),
      );
      const labeledComponents = buildLabeledIdPath(x.id, label);

      const info = {
        name: x.control.name,
        modules: collections
          .distinct(dependeciesByPath[x.id]?.map((p) => p.module) || [])
          .map((m) => colors.green(this.collie.relativePath(m))),
        platforms: dependeciesByPath[x.id]
          ?.map((p) => colors.blue(p.platform))
          .sort() || [],
      };
      insert(tree, labeledComponents, info);
    });

    return tree;
  }
}
