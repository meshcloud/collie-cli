import * as colors from "std/fmt/colors";

import { FoundationRepository } from "../model/FoundationRepository.ts";

export interface RepositoryTree {
  foundations: FoundationsTree;
}

export interface FoundationsTree {
  [foundation: string]: FoundationTree;
}
export interface FoundationTree {
  platforms: PlatformsTree;
}

export interface PlatformsTree {
  [platform: string]: string;
}

export class FoundationConfigTreeBuilder {
  public build(repos: FoundationRepository[]): RepositoryTree {
    const tree: FoundationsTree = {};

    repos.forEach((foundation) => {
      const id = colors.green(foundation.id) +
        " " +
        colors.dim(foundation.resolvePath("README.md"));

      tree[id] = {
        platforms: this.buildPlatformsTree(foundation),
      };
    });

    return { foundations: tree };
  }

  private buildPlatformsTree(repo: FoundationRepository): PlatformsTree {
    const tree: PlatformsTree = {};

    repo.platforms.forEach((p) => {
      tree[colors.blue(p.id)] = colors.dim(
        repo.resolvePlatformPath(p, "README.md"),
      );
    });

    return tree;
  }
}
