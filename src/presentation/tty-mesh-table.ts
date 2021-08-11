import { brightBlue, Table } from "../deps.ts";
import { bold, dim, italic } from "../deps.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";

export class TtyMeshTable extends MeshTable {
  draw(generator: TableGenerator, stats: QueryStatistics | null): void {
    const rows = generator.getRows();

    if (rows.length === 0) {
      console.log("No objects to list");
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
}
