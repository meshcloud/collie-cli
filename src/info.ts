// see https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
export const VERSION = "0.15.2";

/**
 * The flags we want collie to be invoked with.
 *
 * Note that we specify --no-check in line with deno's upcoming default after v1.21
 * see https://deno.com/blog/v1.21#deno-check-and-the-path-to-not-type-checking-by-default
 */
export const FLAGS =
  `--unstable --allow-read --allow-write --allow-env --allow-run --allow-net --no-check`;
export const GITHUB_REPO = "meshcloud/collie-cli";

// Use the CLI Command when mentioning it as a command to run, e.g.: Please run "${CLI} -h" to see more.
// Don't forget to put quotes ("") around a command to make it clear what exact part of the sentence is the command.
export const CLI = "collie";

export const GitHubUrl = "https://github.com/meshcloud/collie-cli";
