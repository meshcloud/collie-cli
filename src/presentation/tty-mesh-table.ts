import { bold, brightBlue } from "std/fmt/colors";

import { Table } from "x/cliffy/table";

import { MeshTable, TableGenerator } from "./mesh-table.ts";

export class TtyMeshTable implements MeshTable {
  draw(generator: TableGenerator): void {
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
      brightBlue(`${rows.length} ${entries}. ${generator.getInfo()}`),
    );
  }
}
