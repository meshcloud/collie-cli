export function parseJsonWithLog<T>(result: string): T {
  try {
    return JSON.parse(result) as T;
  } catch (e) {
    console.error("Could not parse JSON:\n" + result);
    throw e;
  }
}
