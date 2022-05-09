import * as colors from "std/fmt/colors";

import { Table } from "../deps.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";

export class NoTtyMeshTable implements MeshTable {
  draw(generator: TableGenerator): void {
    const rows = generator.getRows();

    if (rows.length === 0) {
      console.log("No objects to list");
      return;
    }

    const table = new Table();
    table
      .header(generator.getColumns().map((value) => colors.bold(value)))
      .body(rows)
      .render();
  }
}
