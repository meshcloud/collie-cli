import { dim, yellow } from "std/fmt/colors";

import { Table } from "x/cliffy/table";
import { MeshTag } from "../mesh/MeshTenantModel.ts";

export abstract class TableGenerator {
  abstract getColumns(): string[];
  abstract getRows(): string[][];
  abstract getInfo(): string;

  protected formatMeshTags(meshTags: MeshTag[]) {
    const tempRows: Array<string>[] = [];
    meshTags.forEach((x) => {
      const t = new MeshTableTag(x);

      tempRows.push([`${dim(t.tagName)}: `, yellow(t.tagValues[0])]);
      x.tagValues.slice(1).forEach((t) => tempRows.push(["", yellow(t)]));
    });
    const tempTable = new Table();
    tempTable.body(tempRows).border(false).maxColWidth(45);

    return tempTable.toString();
  }
}

export interface MeshTable {
  draw(generator: TableGenerator): void;
}

export class MeshTableTag implements MeshTag {
  constructor(private readonly tag: MeshTag) {}

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
