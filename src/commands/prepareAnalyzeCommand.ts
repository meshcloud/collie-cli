import { Logger } from "../cli/Logger.ts";
import {
  FoundationDependencies,
  KitDependencyAnalyzer,
} from "../kit/KitDependencyAnalyzer.ts";
import { KitModuleRepository } from "../kit/KitModuleRepository.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { FoundationRepository } from "../model/FoundationRepository.ts";
import { ModelValidator } from "../model/schemas/ModelValidator.ts";

export interface AnalyzeResults {
  modules: KitModuleRepository;
  dependencies: {
    foundation: FoundationRepository;
    results: FoundationDependencies;
  }[];
}

export async function prepareAnalyzeCommand(
  collie: CollieRepository,
  logger: Logger,
) {
  const analyzeResults = await analyze(collie, logger);

  return analyzeResults;
}

async function analyze(
  collie: CollieRepository,
  logger: Logger,
): Promise<AnalyzeResults> {
  const validator = new ModelValidator(logger);

  const modules = await KitModuleRepository.load(collie, validator, logger);
  const foundations = await collie.listFoundations();

  const tasks = foundations.map(async (f) => {
    const foundation = await FoundationRepository.load(collie, f, validator);
    const analyzer = new KitDependencyAnalyzer(collie, modules, logger);

    return {
      foundation,
      results: await analyzer.findKitModuleDependencies(foundation),
    };
  });

  const dependencies = await Promise.all(tasks);

  return { modules, dependencies };
}
