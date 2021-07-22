import { CLICommand } from "../config/config.model.ts";
import { brightBlue, log, Table } from "../deps.ts";
import { bold, dim, italic } from "../deps.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";

export class TtyMeshTable implements MeshTable {
  draw(generator: TableGenerator, stats: QueryStatistics | null): void {
    const rows = generator.getRows();

    if (rows.length === 0) {
      log.info("No objects to list");
      return;
    }

    const table = new Table();
    table
      .header(generator.getColumns().map((value) => bold(value)))
      .body(rows)
      .border(true)
      .render();

    const entries = rows.length > 1 ? "entries" : "entry";
    console.log(
      brightBlue(
        `${rows.length} ${entries}. ${generator.getInfo()}`,
      ),
    );

    if (stats) {
      console.log(
        dim(italic(this.formatStats(stats))),
      );
    }
  }

  formatStats(stats: QueryStatistics): string {
    const summary: string[] = [];

    if (stats.duration["cache"]) {
      summary.push(
        `Loaded from cache in ${stats.duration.cache}ms. See "${CLICommand} cache" for details.`,
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
