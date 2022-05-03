export type ProcessRunnerOptions = Partial<
  Pick<Deno.RunOptions, "cwd" | "env">
>;
