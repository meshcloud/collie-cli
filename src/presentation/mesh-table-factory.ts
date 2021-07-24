import { os } from "../deps.ts";
import { MeshTable } from "./mesh-table.ts";
import { NoTtyMeshTable } from "./no-tty-mesh-table.ts";
import { TtyMeshTable } from "./tty-mesh-table.ts";

export class MeshTableFactory {
  constructor(
    private isatty: boolean,
  ) {
  }

  buildMeshTable(): MeshTable {
    if (this.isatty && (os.default.platform() !== "windows")) {
      // there are output issues with borders in windows terminal
      return new TtyMeshTable();
    } else {
      return new NoTtyMeshTable();
    }
  }
}
