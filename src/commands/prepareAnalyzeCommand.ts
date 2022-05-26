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

  if (!analyzeResults.modules.all.length) {
    logger.warn("no kit modules found");
    logger.tipCommand(`To define a new kit module run`, `kit new "my-module"`);
    return;
  }

  const hasAppliedModules = analyzeResults.dependencies.some((d) =>
    d.results.platforms.some((p) => p.modules.length)
  );

  if (!hasAppliedModules) {
    logger.warn("no kit modules applied to any platform");
    logger.tipCommand(`To apply a kit module run`, `kit apply "my-module"`);
    return;
  }

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
