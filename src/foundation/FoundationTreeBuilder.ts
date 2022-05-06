import * as path from "std/path";
import * as colors from "std/fmt/colors";

import { FoundationRepository } from "../model/FoundationRepository.ts";
import {
  FoundationDependencies,
  PlatformDependencies,
} from "../kit/KitDependencyAnalyzer.ts";
import { insert } from "../model/tree.ts";

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

export class FoundationTreeBuilder {
  constructor(private readonly foundation: FoundationRepository) {}

  build(
    dependencies: FoundationDependencies,
    opts: { useColors: boolean },
  ): FoundationsTree {
    const tree: FoundationsTree = {};

    tree[dependencies.foundation] = {
      platforms: this.buildPlatformsTree(dependencies.platforms, opts),
    };

    return tree;
  }

  public buildPlatformsTree(
    platforms: PlatformDependencies[],
    opts: { useColors: boolean },
  ): PlatformsTree {
    return withColors(opts.useColors, () => {
      const tree: PlatformsTree = {};

      platforms.forEach((p) => {
        tree[p.platform.name] = this.buildModuleTree(p);
      });

      return tree;
    });
  }

  private buildModuleTree(platform: PlatformDependencies): PlatformTree {
    const tree: PlatformTree = {};

    const platformPath = this.foundation.resolvePlatformPath(platform.platform);

    platform.modules.forEach((m) => {
      const moduleDir = path.relative(
        platformPath,
        path.resolve(m.sourcePath, "../"),
      );

      const components = moduleDir.split(path.sep);

      insert<ModuleNode>(tree, components, {
        kitModule: colors.green(m.kitModulePath),
        controls: m.kitModule?.compliance?.map((x) => colors.blue(x.control)) ||
          [],
      });
    });

    return tree;
  }
}

function withColors<T>(enabled: boolean, f: () => T) {
  const wasEnabled = colors.getColorEnabled();
  colors.setColorEnabled(enabled);

  try {
    return f();
  } finally {
    colors.setColorEnabled(wasEnabled);
  }
}
