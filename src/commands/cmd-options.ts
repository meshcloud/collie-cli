import { EnumType } from "../deps.ts";
import { OutputFormat } from "../presentation/output-format.ts";

export const OutputFormatType = new EnumType(Object.values(OutputFormat));

export interface CmdGlobalOptions {
  debug: boolean;
  verbose: boolean;
  output: OutputFormat;
}
