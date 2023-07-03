import { ITypeInfo } from "x/cliffy/command";
import { CommandOptionError } from "./CommandOptionError.ts";

export const dateRegex = /^\d\d\d\d-\d\d-\d\d$/;

export function dateType({ label, name, value }: ITypeInfo): string {
  if (!dateRegex.test(value.toLowerCase())) {
    throw new CommandOptionError(
      `${label} "${name}" must be a valid date in the form of YYYY-MM-DD, but got "${value}".`,
    );
  }

  return value;
}
