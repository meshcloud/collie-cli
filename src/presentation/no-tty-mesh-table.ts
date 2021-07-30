import { log, Table } from "../deps.ts";
import { bold } from "../deps.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";

export class NoTtyMeshTable extends MeshTable {
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
      .render();

    if (stats) {
      console.log(
        this.formatStats(stats),
      );
    }
  }
}
