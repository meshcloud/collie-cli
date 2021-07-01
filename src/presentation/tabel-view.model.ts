import { brightBlue, log, Table } from "../deps.ts";
import { MeshTag } from "../mesh/mesh-tenant.model.ts";
import { bold } from "../deps.ts";

export abstract class TableOutput implements TableConfig {
  public abstract info: string;
  constructor(
    readonly columns: string[],
  ) {}

  public abstract generateRows(): string[][];

  public draw() {
    const rows = this.generateRows();

    if (rows.length === 0) {
      log.info("No objects to list");
      return;
    }

    const table = new Table();
    table
      .header(this.columns.map((value) => bold(value)))
      .body(rows);
    if (Deno.isatty(Deno.stdout.rid)) {
      table
        .border(true)
        .render();
      console.log(
        brightBlue(
          `${rows.length} ${
            rows.length > 1 ? "entries" : "entry"
          }. ${this.info}`,
        ),
      );
    } else {
      table.render();
    }
  }
}

export class MeshTableTag implements MeshTag {
  constructor(
    private readonly tag: MeshTag,
  ) {}

  get tagName(): string {
    return this.tag.tagName;
  }

  get tagValues(): string[] {
    return this.tag.tagValues;
  }

  public toString(): string {
    return `${this.tag.tagName}: ${this.tag.tagValues.join(";")}`;
  }
}

interface TableConfig {
  columns: string[];
  generateRows(): Array<string>[];
}
