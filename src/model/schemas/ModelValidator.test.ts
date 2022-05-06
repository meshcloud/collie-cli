import { Logger } from "../../cli/Logger.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { CollieRepository } from "../CollieRepository.ts";
import { ModelValidator } from "./ModelValidator.ts";

import { assertEquals } from "/dev-deps.ts";

Deno.test("can validate FoundationConfig", () => {
  const collie = new CollieRepository("./");
  const logger = new Logger(collie, {
    quiet: false,
    debug: false,
    verbose: false,
    output: OutputFormat.JSON,
  });

  const sut = new ModelValidator(logger);

  const data = { name: "1", bar: "abc" };

  const { errors } = sut.validateFoundationConfig(data);

  assertEquals(
    errors && errors[0].message,
    "must have required property 'platforms'",
  );
});
