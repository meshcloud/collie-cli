import { assertEquals, assertThrows } from "/dev-deps.ts";
import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { AzCliResultHandler } from "./AzCliResultHandler.ts";
import { MeshAzurePlatformError } from "../../errors.ts";
import { AzureErrorCode } from "../../errors.ts";

Deno.test("handles configuration not set", () => {
  const result: ProcessResultWithOutput = {
    status: {
      success: false,
      code: 1,
    },
    stderr:
      "Command group 'config' is experimental and under development. Reference and support levels: https://aka.ms/CLI_refstatus\n" +
      "Configuration 'extension.use_dynamic_install' is not set.",
    stdout: "",
  };

  const sut = new AzCliResultHandler();

  assertThrows(
    () => {
      sut.handleResult(
        ["az", "config", "get", "extension.use_dynamic_install"],
        {},
        result,
      );
    },
    (error: Error) => {
      const azError = error as MeshAzurePlatformError;
      assertEquals(azError.errorCode, AzureErrorCode.AZURE_CLI_CONFIG_NOT_SET);
    },
  );
});
