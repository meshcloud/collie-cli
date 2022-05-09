import { EnumType } from "../deps.ts";
import { OutputFormat } from "../presentation/output-format.ts";

export const OutputFormatType = new EnumType(Object.values(OutputFormat));

export interface GlobalCommandOptions {
  debug: boolean;
  verbose: boolean;
  output: OutputFormat;
}
