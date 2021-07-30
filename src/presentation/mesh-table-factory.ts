import { MeshTable } from "./mesh-table.ts";
import { NoTtyMeshTable } from "./no-tty-mesh-table.ts";
import { TtyMeshTable } from "./tty-mesh-table.ts";
import { isWindows } from "../os.ts";

export class MeshTableFactory {
  constructor(
    private isatty: boolean,
  ) {
  }

  buildMeshTable(): MeshTable {
    if (this.isatty && !isWindows) {
      // there are output issues with borders in windows terminal
      return new TtyMeshTable();
    } else {
      return new NoTtyMeshTable();
    }
  }
}
