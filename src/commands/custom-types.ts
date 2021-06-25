import { ITypeInfo } from "../deps.ts";
import { CmdOptionError } from "./cmd-errors.ts";

const dateRegex = /^\d\d\d\d-\d\d-\d\d$/;

export function dateType({ label, name, value }: ITypeInfo): string {
  if (!dateRegex.test(value.toLowerCase())) {
    throw new CmdOptionError(
      `${label} "${name}" must be a valid date in the form of YYYY-MM-DD, but got "${value}".`,
    );
  }

  return value;
}
