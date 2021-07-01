import { MeshTag } from "../mesh/mesh-tenant.model.ts";

export interface TableGenerator {
  getColumns(): string[];
  getRows(): string[][];
  getInfo(): string;
}

export interface MeshTable {
  draw(generator: TableGenerator): void;
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
