import { log } from "./deps.ts";
import { ShellOutput } from "./process/shell-output.ts";

export function parseJsonWithLog<T>(result: string): T {
  try {
    return JSON.parse(result) as T;
  } catch (e) {
    log.error("Could not parse JSON: " + result);
    throw e;
  }
}

// Use this method when parsing input coming from the [ShellRunner] so the stderr can be potentially shown.
export function parseJsonStdoutWithLog<T>(
  result: ShellOutput,
  command: string,
): T {
  try {
    return JSON.parse(result.stdout) as T;
  } catch (e) {
    log.error("Could not parse JSON for command '" + command + "'");
    if (result.code !== 0) {
      log.error(
        "Could not parse JSON as an error with code " + result.code +
          " was given. The following stderr is given: " + result.stderr,
      );
    } else {
      log.error("The following stdout is given: " + result.stdout);
    }
    throw e;
  }
}
