import { CollieRepository } from "../model/CollieRepository.ts";
import { StringType } from "x/cliffy/command";

export class FoundationType extends StringType {
  async complete(): Promise<string[]> {
    const collie = await CollieRepository.load();

    return await collie.listFoundations();
  }
}
