import { MeshTag } from "../mesh/mesh-tenant.model.ts";
import { QueryStatistics } from "../mesh/query-statistics.ts";
import { dim, Table, yellow } from "../deps.ts";
import { CLICommand } from "../config/config.model.ts";

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

export abstract class MeshTable {
  abstract draw(generator: TableGenerator, stats: QueryStatistics | null): void;

  protected formatStats(stats: QueryStatistics): string {
    const summary: string[] = [];

    if (stats.duration["cache"]) {
      summary.push(
        `Loaded from cache in ${stats.duration.cache}ms. See "${CLICommand} cache" for details.`,
      );
    }

    const cloudstats = Object
      .entries(stats.duration)
      .filter(([cloud]) => cloud !== "cache")
      .map(([cloud, d]) => `${cloud}: ${(d || 0) / 1000}s`);

    if (cloudstats.length) {
      summary.push(`Queried from cloud - ${cloudstats.join(", ")}.`);
    }

    return summary.join(" ");
  }
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
