import * as colors from "std/fmt/colors";

import { QueryStatistics } from "../mesh/QueryStatistics.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";
import { Presenter } from "./presenter.ts";

export class TablePresenter implements Presenter {
  constructor(
    private readonly generator: TableGenerator,
    private readonly meshTable: MeshTable,
    private readonly stats: QueryStatistics,
  ) {}

  present(): void {
    this.meshTable.draw(this.generator);

    console.log(
      colors.dim(colors.italic(this.formatStats(this.stats))),
    );
  }

  private formatStats(stats: QueryStatistics): string {
    const summary: string[] = [];

    if (stats.duration["cache"]) {
      summary.push(
        `Loaded from cache in ${stats.duration.cache}ms. Run collie with --refresh option to clear cache.`,
      );
    }

    const cloudstats = Object
      .entries(stats.duration)
      .filter(([cloud]) => cloud !== "cache")
      .map(([cloud, d]) => `${cloud}: ${(d || 0) / 1000}s`);

    if (cloudstats.length) {
      summary.push(`Queried from cloud - ${cloudstats.join(", ")}.`);
    }

    return summary.join(" ");
  }
}
