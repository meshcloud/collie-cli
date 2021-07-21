import { QueryStatistics } from "../mesh/mesh-adapter.ts";
import { MeshTable, TableGenerator } from "./mesh-table.ts";
import { Presenter } from "./presenter.ts";

export class TablePresenter implements Presenter {
  constructor(
    private readonly generator: TableGenerator,
    private readonly meshTable: MeshTable,
    private readonly stats: QueryStatistics,
  ) {}

  present(): void {
    this.meshTable.draw(this.generator, this.stats);
  }
}
