import { assertEquals } from "../dev-deps.ts";
import { KitDependencyAnalyzer } from "./KitDependencyAnalyzer.ts";

Deno.test("can parse source", () => {
  const hcl = `include "account" {t
  path   = find_in_parent_folders("admin-account.hcl")
  expose = true
}

terraform {
  asdads = asdasda
  source = "\${get_repo_root()}/kit/aws/root"
  asdads = asdasda
}

inputs = {
  aws_root_account_id  = include.account.locals.account_vars.account_id;
  source = asd
}`;

  const actual = KitDependencyAnalyzer.parseTerraformSource(hcl);
  const expected = "${get_repo_root()}/kit/aws/root";

  assertEquals(actual, expected);
});
