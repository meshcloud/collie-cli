import { Config, ConnectedConfig } from "../config/config.model.ts";
import { green, red } from "../deps.ts";
import { TableOutput } from "./tabel-view.model.ts";

export class ConfigTableView extends TableOutput {
  public info = "";

  constructor(readonly config: Config, columns: (keyof ConnectedConfig)[]) {
    super(columns);
  }

  public generateRows(): string[][] {
    var row: string[] = [];
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
}
