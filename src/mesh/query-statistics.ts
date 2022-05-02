import { MeshPlatform } from "./mesh-tenant.model.ts";

type DurationContainer = { [P in MeshPlatform | "cache"]?: number };

export const STATS_LAYER_CACHE = 0;
export const STATS_LAYER_PLATFORM = 1;

export class QueryStatistics {
  duration: DurationContainer = {};

  /**
   * With the layer you control if the statistics are overwritten.
   * As soon as a higher layer comes in the last entries are cleared.
   * Its helpful to "write through" e.g. if you have a cache which
   * calls through a deeper layer and you want to have the deeper layer
   * take precedence.
   */
  private lastLayerLogged = 0;

  async recordQuery<T>(
    source: MeshPlatform | "cache",
    layer = 0,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now(); // note: ms precision is enough for collie, we don't require --allow-hrtime for more precision

    const result = await fn();

    const end = performance.now();
    const passed = end - start;

    console.debug(`recording query statistics for ${source}: ${passed}ms`);

    if (layer == this.lastLayerLogged) {
      this.duration[source] = (this.duration[source] || 0) + passed;
    }

    if (layer > this.lastLayerLogged) {
      this.lastLayerLogged = layer;
      // clear current layer
      this.duration = {};
      this.duration[source] = (this.duration[source] || 0) + passed;
    }

    return result;
  }
}
