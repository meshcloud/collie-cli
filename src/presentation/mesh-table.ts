import { MeshTag } from "../mesh/mesh-tenant.model.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";

export interface TableGenerator {
  getColumns(): string[];
  getRows(): string[][];
  getInfo(): string;
}

export interface MeshTable {
  draw(generator: TableGenerator, stats: QueryStatistics | null): void;
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
