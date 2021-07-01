import { Config, ConnectedConfig } from "../config/config.model.ts";
import { green, red } from "../deps.ts";
import { TableGenerator } from "./mesh-table.ts";

export class ConfigTableViewGenerator implements TableGenerator {
  constructor(
    readonly config: Config,
    private columns: (keyof ConnectedConfig)[],
  ) {
  }

  getColumns(): string[] {
    return this.columns;
  }

  getRows(): string[][] {
    const row: string[] = [];
    this.columns.forEach((column) => {
      if (column === "GCP" || column === "AWS" || column === "Azure") {
        if (this.config.connected[column]) {
          row.push(green(String(this.config.connected[column])));
        } else {
          row.push(red(String(this.config.connected[column])));
        }
      }
    });

    return [row];
  }

  getInfo(): string {
    return "";
  }
}
