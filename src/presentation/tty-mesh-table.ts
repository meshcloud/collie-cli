import { brightBlue, log, Table } from "../deps.ts";
import { bold } from "../deps.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";

export class TtyMeshTable implements MeshTable {
  draw(generator: TableGenerator): void {
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

    console.log(
      brightBlue(
        `${rows.length} ${
          rows.length > 1 ? "entries" : "entry"
        }. ${generator.getInfo()}`,
      ),
    );
  }
}
