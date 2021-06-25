export async function serial<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];

  for (const fn of fns) {
    const p = await fn();
    results.push(p);
  }

  return results;
}

/**
 * You can use it to delay resolution of a promise like so:
 *
 * .then(sleeper(1000)).then(...)
 *
 * @param ms Time in ms to pause execution.
 * @returns The original value given from the parent promise.
 */
export function sleeper<T>(ms: number) {
  return function (x: T) {
    return new Promise((resolve) => setTimeout(() => resolve(x), ms));
  };
}

/**
 * You can use it to pause execution.
 *
 * @param ms Time in ms to pause execution.
 */
export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
