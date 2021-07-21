import { log } from "../deps.ts";
import { MeshPlatform } from "./mesh-tenant.model.ts";

export class QueryStatistics {
  readonly duration: {
    [P in MeshPlatform | "cache"]?: number;
  } = {};

  async recordQuery<T>(
    source: MeshPlatform | "cache",
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now(); // note: ms precision is enough for collie, we don't require --allow-hrtime for more precision

    const result = await fn();

    const end = performance.now();
    const passed = end - start;

    log.debug(`recording query statistics for ${source}: ${passed}ms`);
    this.duration[source] = (this.duration[source] || 0) + passed;

    return result;
  }
}
