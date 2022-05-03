/**
 * You can use it to pause execution.
 *
 * @param ms Time in ms to pause execution.
 */
export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
