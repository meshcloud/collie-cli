// Note: this is stolen from a broken Deno library (https://github.com/alextes/run_with_limit)
// There is an open issue that should fix the issue and then we can just use the library itself.
interface Runnable<A> {
  fn: () => Promise<A>;
  resolve: (value: A | PromiseLike<A>) => void;
  reject: (reason?: any) => void;
}

/**
 * Takes a number, setting the concurrency for the promise queue. Returns a set of functions to use the queue.
 */
export function makeRunWithLimit<A>(
  concurrency: number,
) {
  if (concurrency < 1) {
    throw new Error("concurrency should be a positive number");
  }

  const queue: Runnable<A>[] = [];
  let activeCount = 0;

  async function run<A>({ fn, resolve, reject }: Runnable<A>) {
    activeCount++;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    activeCount--;

    const mNextRunnable = queue.shift();
    if (typeof mNextRunnable !== "undefined") {
      run(mNextRunnable);
    }
  }

  async function enqueue(runnable: Runnable<A>) {
    if (activeCount < concurrency) {
      run(runnable);
    } else {
      queue.push(runnable);
    }
  }

  /**
   * Pass a thunk to this function that returns a promise.
   */
  async function runWithLimit(fn: () => Promise<A>) {
    return new Promise<A>((resolve, reject) =>
      enqueue({ fn, resolve, reject })
    );
  }

  /**
   * Call to get the number of promises that are currently running.
   */
  function getActiveCount() {
    return activeCount;
  }

  /**
   * Call to check how many promises are still waiting to start execution.
   */
  function getPendingCount() {
    return queue.length;
  }

  return {
    runWithLimit,
    getActiveCount,
    getPendingCount,
  };
}
