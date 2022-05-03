export async function withTempDir(
  f: (tmp: string) => Promise<void>,
): Promise<void> {
  const tmp = await Deno.makeTempDir();

  try {
    return await f(tmp);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
}

export async function withRestoreCwd(f: () => Promise<void>): Promise<void> {
  const cwd = Deno.cwd();

  try {
    return await f();
  } finally {
    Deno.chdir(cwd);
  }
}
