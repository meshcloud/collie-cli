import { CLICommand } from "../config/config.model.ts";
import { brightBlue, log, Table } from "../deps.ts";
import { bold, dim, italic } from "../deps.ts";
import { QuerySource, QueryStatistics } from "../mesh/mesh-adapter.ts";
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

  formatStats(stats: QueryStatistics) {
    if (stats.source === QuerySource.Cache) {
      return `Loaded from cache in ${stats.duration.cache}ms. See "${CLICommand} cache" for details.`;
    }

    const cloudstats = Object
      .entries(stats.duration)
      .map(([cloud, d]) => `${cloud}: ${(d || 0) / 1000}s`);

    return `Queried from cloud in ${cloudstats.join(", ")}.`;
  }
}
