import { assertEquals } from "std/testing/assert";
import * as path from "std/path";
import { withTempDir } from "../cli/test-util.ts";
import { Logger } from "../cli/Logger.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../cli/DirectoryGenerator.ts";
import { KitModuleParser } from "./KitModuleParser.ts";
import { ModelValidator } from "../model/schemas/ModelValidator.ts";
import { CollieRepository } from "../model/CollieRepository.ts";

Deno.test("integration test for load", async () => {
  await withTempDir(async (tmp) => {
    const stubRepo = CollieRepository.uninitialized(tmp);
    const logger = new Logger(stubRepo, {});
    const validator = new ModelValidator(logger);
    const sut = new KitModuleParser(stubRepo, validator, logger);

    const dir: Dir = {
      name: path.join(tmp, "kit"),
      entries: [
        {
          name: "README.md",
          content: "ignore me",
        },
        {
          name: ".terraform",
          entries: [
            {
              name: "README.md",
              content: "ignore me",
            },
          ],
        },
        {
          name: "invalid",
          entries: [
            {
              name: "README.md",
              content: "not a proper kit module",
            },
          ],
        },
        {
          name: "valid",
          entries: [
            {
              name: "README.md",
              content: `---
name: test
summary: it's cool
---

# some
markdown`,
            },
          ],
        },
      ],
    };

    await new DirectoryGenerator(WriteMode.overwrite, logger).write(dir);

    const result = await sut.load();

    const expected = [
      {
        definitionPath: path.join("kit", "valid", "README.md"),
        id: "valid",
        kitModule: {
          name: "test",
          summary: "it's cool",
        },
        kitModulePath: path.join("kit", "valid"),
        readme: "\n# some\nmarkdown",
      },
    ];

    assertEquals(
      result.filter((x) => !!x),
      expected,
    );
  });
});
