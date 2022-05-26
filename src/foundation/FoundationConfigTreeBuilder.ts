import * as colors from "std/fmt/colors";
import { CollieRepository } from "../model/CollieRepository.ts";

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
  constructor(private readonly collie: CollieRepository) {}
  public build(repos: FoundationRepository[]): RepositoryTree {
    const tree: FoundationsTree = {};

    repos.forEach((foundation) => {
      const id = colors.green(foundation.id) +
        " " +
        colors.dim(
          this.collie.relativePath(foundation.resolvePath("README.md")),
        );

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
        this.collie.relativePath(repo.resolvePlatformPath(p, "README.md")),
      );
    });

    return tree;
  }
}
