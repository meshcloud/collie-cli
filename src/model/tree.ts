import * as colors from "std/fmt/colors";
import * as path from "std/path";

export interface Tree<T> {
  [path: string]: Tree<T> | T;
}

export function insert<T>(tree: Tree<T>, path: string[], module: T) {
  const id = path.shift();
  if (!id) {
    throw new Error("could not insert into tree, path was empty");
  }

  // we're at the leaf, insert leaf and yield
  if (!path.length) {
    tree[id] = module;
    return;
  }

  // insert another node and descend
  tree[id] = tree[id] || {};
  insert(tree[id] as Tree<T>, path, module);
}

export function buildLabeledIdPath(id: string, label: string) {
  const components = id.split("/");
  const lastComponent = components.pop();
  const labeledComponents = [
    ...components,
    `${lastComponent}: ${
      colors.dim(
        label,
      )
    }`,
  ];
  return labeledComponents;
}
