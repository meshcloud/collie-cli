import { log } from "./deps.ts";

export function parseJsonWithLog<T>(result: string): T {
  try {
    return JSON.parse(result) as T;
  } catch (e) {
    log.error("Could not parse JSON:\n" + result);
    throw e;
  }
}
