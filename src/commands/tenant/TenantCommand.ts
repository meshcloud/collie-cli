import { makeTopLevelCommand } from "../TopLevelCommand.ts";

export type TenantCommand = ReturnType<typeof makeTenantCommand>;
import { OutputFormat } from "/presentation/output-format.ts";
import { EnumType } from "/deps.ts";

export const OutputFormatType = new EnumType(Object.values(OutputFormat));

export interface OutputOptions {
  output: OutputFormat;
}

export function makeTenantCommand() {
  return makeTopLevelCommand()
    .globalType("output", OutputFormatType)
    .globalOption(
      "-p, --platform <platform:platform>",
      "list tenants for this platform only",
    )
    .globalOption("--refresh", "force refresh of any cached tenant state");
}
