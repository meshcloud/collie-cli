import * as path from "std/path";
import * as colors from "std/fmt/colors";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import {
  FoundationDependencies,
  PlatformDependencies,
} from "../kit/KitDependencyAnalyzer.ts";
import { buildLabeledIdPath, insert } from "../model/tree.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

export interface FoundationsTree {
  [foundation: string]: FoundationTree;
}

export interface FoundationTree {
  platforms: PlatformsTree;
}

export interface PlatformsTree {
  [platform: string]: PlatformTree;
}

export interface PlatformTree {
  [path: string]: PlatformTree | ModuleNode;
}

export interface ModuleNode {
  kitModule: string;
  controls: string[];
}

export class FoundationDependenciesTreeBuilder {
  constructor(
    private readonly collie: CollieRepository,
    private readonly foundation: FoundationRepository,
  ) {}

  build(dependencies: FoundationDependencies): FoundationsTree {
    const tree: FoundationsTree = {};

    tree[dependencies.foundation] = {
      platforms: this.buildPlatformsTree(dependencies.platforms),
    };

    return tree;
  }

  public buildPlatformsTree(platforms: PlatformDependencies[]): PlatformsTree {
    const tree: PlatformsTree = {};

    platforms.forEach((p) => {
      tree[p.platform.id] = this.buildModuleTree(p);
    });

    return tree;
  }

  private buildModuleTree(platform: PlatformDependencies): PlatformTree {
    const tree: PlatformTree = {};

    const resolvedPlatformPath = this.foundation.resolvePlatformPath(
      platform.platform,
    );

    platform.modules.forEach((m) => {
      const resolvedPlatformModulePath = this.collie.resolvePath(
        path.dirname(m.sourcePath),
      );

      const id = resolvedPlatformModulePath
        .substring(resolvedPlatformPath.length + "/".length)
        .replaceAll("\\", "/"); // convert to posix style path if required

      const label = m.sourcePath;
      const labeledComponents = buildLabeledIdPath(id, label);

      insert<ModuleNode>(tree, labeledComponents, {
        kitModule: colors.green(m.kitModuleId),
        controls: m.kitModule?.compliance?.map((x) => colors.blue(x.control)) ||
          [],
      });
    });

    return tree;
  }
}
