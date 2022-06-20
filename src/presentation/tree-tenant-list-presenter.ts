import * as colors from "std/fmt/colors";
import { jsonTree } from "x/json_tree";

import { insert, Tree } from "../model/tree.ts";
import { MeshTenant } from "../mesh/MeshTenantModel.ts";
import { Presenter } from "./presenter.ts";

export class TreeTenantListPresenter implements Presenter {
  constructor(private readonly meshTenants: MeshTenant[]) {}

  // deno-lint-ignore require-await
  async present() {
    // we currently don't render any properties in the tree for the leafs
    // so we just use an empty type for leafs

    // deno-lint-ignore ban-types
    const tree: Tree<{}> = {};

    this.meshTenants.forEach((x) =>
      insert(
        tree,
        [
          ...x.ancestors.map((x) => `${x.name} ${colors.dim(x.id)}`),
          `${x.platformTenantName} ${colors.dim(x.platformTenantId)}`,
        ],
        {},
      )
    );

    const out = jsonTree(tree, true);
    console.log(out);
  }
}
