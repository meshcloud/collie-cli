import { MeshError } from "../errors.ts";

export class CommandOptionError extends MeshError {
  constructor(msg: string) {
    super(msg);
  }
}
