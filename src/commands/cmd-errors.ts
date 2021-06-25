import { MeshError } from "../errors.ts";

export class CmdOptionError extends MeshError {
  constructor(msg: string) {
    super(msg);
  }
}
