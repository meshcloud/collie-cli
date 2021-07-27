import { Config, ConnectedConfig } from "../config/config.model.ts";
import { green, red } from "../deps.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";
import { TableGenerator } from "./mesh-table.ts";

export class ConfigTableViewGenerator extends TableGenerator {
  readonly stats = new QueryStatistics();

  constructor(
    readonly config: Config,
    private columns: (keyof ConnectedConfig)[],
  ) {
    super();
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
