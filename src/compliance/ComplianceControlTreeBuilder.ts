import * as colors from "std/fmt/colors";

import { ComplianceControlRepository } from "./ComplianceControlRepository.ts";
import { buildLabeledIdPath, insert, Tree } from "/model/tree.ts";
import { FoundationDependencies } from "../kit/KitDependencyAnalyzer.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { KitModuleRepository } from "../kit/KitModuleRepository.ts";

export interface ComplianceControlInfo {
  name: string;
  modules: string[];
  platforms: string[];
}

export class ComplianceControlTreeBuilder {
  constructor(
    private readonly collie: CollieRepository,
    private readonly kitModules: KitModuleRepository,
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

    const dependeciesByPath = Object.groupBy(entries, (x) => x?.control);

    const tree: Tree<ComplianceControlInfo> = {};

    this.controls.all.forEach((control) => {
      const label = control.definitionPath;
      const labeledComponents = buildLabeledIdPath(control.id, label);

      const info = {
        name: control.control.name,
        modules: this.kitModules.all
          .filter((m) =>
            m.kitModule.compliance?.some((c) => c.control == control.id)
          )
          .map((m) => colors.green(this.collie.relativePath(m.kitModulePath))),
        platforms: dependeciesByPath[control.id]
          ?.map((p) => colors.blue(p.platform))
          .sort() || [],
      };
      insert(tree, labeledComponents, info);
    });

    return tree;
  }
}
