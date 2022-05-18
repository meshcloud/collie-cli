import { CollieRepository } from "../model/CollieRepository.ts";
import { StringType } from "../deps.ts";

export class FoundationType extends StringType {
  async complete(): Promise<string[]> {
    return await new CollieRepository("./").listFoundations();
  }
}
