import { path } from "../deps.ts";
import { assertEquals } from "../dev-deps.ts";
import { Dir, DirectoryGenerator, WriteMode } from "./DirectoryGenerator.ts";
import { Logger } from "./Logger.ts";
import { withRestoreCwd, withTempDir } from "./test-util.ts";

const dir: Dir = {
  name: "x",
  entries: [
    {
      name: "y",
      entries: [{ name: "z", content: "1" }],
    },
  ],
};

const dir2: Dir = {
  name: "x",
  entries: [
    {
      name: "y",
      entries: [
        { name: "z", content: "-1" }, // update file content -
        { name: "zz", content: "2" }, // a new file in an existing dir
      ],
    },
    {
      name: "yy",
      entries: [
        { name: "zzz", content: "3" }, // a new dir and a new file
      ],
    },
  ],
};

async function assertContent(pathComponents: string[], expected: string) {
  const result = await Deno.readTextFile(path.join(...pathComponents));

  assertEquals(result, expected);
}

const nullLogger: Logger = {
  verbose: () => {},
  // deno-lint-ignore no-explicit-any
} as any;

Deno.test(
  "can write new trees",
  async () =>
    await withTempDir(async (tmp) => {
      const sut = new DirectoryGenerator(WriteMode.overwrite, nullLogger);
      await sut.write(dir, tmp);

      await assertContent([tmp, "x", "y", "z"], "1");
    }),
);

Deno.test(
  "can merge a tree into existing dir (overwrite mode)",
  async () =>
    await withTempDir(async (tmp) => {
      const sut = new DirectoryGenerator(WriteMode.overwrite, nullLogger);
      await sut.write(dir, tmp);
      await sut.write(dir2, tmp);

      await assertContent([tmp, "x", "y", "z"], "-1");
      await assertContent([tmp, "x", "y", "zz"], "2");
      await assertContent([tmp, "x", "yy", "zzz"], "3");
    }),
);

Deno.test(
  "can merge a tree into existing dir (skip mode)",
  async () =>
    await withTempDir(async (tmp) => {
      const sut = new DirectoryGenerator(WriteMode.skip, nullLogger);
      await sut.write(dir, tmp);
      await sut.write(dir2, tmp);

      await assertContent([tmp, "x", "y", "z"], "1");
      await assertContent([tmp, "x", "y", "zz"], "2");
      await assertContent([tmp, "x", "yy", "zzz"], "3");
    }),
);

Deno.test(
  "can write into relative dir",
  async () =>
    await withRestoreCwd(async () => {
      await withTempDir(async (tmp) => {
        Deno.chdir(tmp);

        const sut = new DirectoryGenerator(WriteMode.overwrite, nullLogger);
        await sut.write(dir, "././"); // repeatedly referring to the same dir works as well

        // assertContent uses an absolute dir
        await assertContent([tmp, "x", "y", "z"], "1");
      });
    }),
);
