import { Logger } from "../cli/Logger.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { ModelValidator } from "../model/schemas/ModelValidator.ts";
import { KitModule } from "./KitModule.ts";
import { KitModuleParser } from "./KitModuleParser.ts";
import { ParsedKitModule } from "./ParsedKitModule.ts";

export class KitModuleRepository {
  private readonly modulesById: Map<string, KitModule>;

  constructor(private readonly modules: ParsedKitModule[]) {
    this.modulesById = new Map(modules.map((x) => [x.id, x.kitModule]));
  }

  tryFindById(id: string) {
    return this.modulesById.get(id);
  }

  get all() {
    return this.modules;
  }

  public static async load(
    repo: CollieRepository,
    validator: ModelValidator,
    logger: Logger,
  ) {
    const parser = new KitModuleParser(repo, validator, logger);
    const modules = await parser.load();

    const parsedModules = modules.filter((x): x is ParsedKitModule => !!x);

    return new KitModuleRepository(parsedModules);
  }
}
