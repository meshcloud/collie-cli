import { InteractivePrompts } from "../commands/interactive/InteractivePrompts.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { CollieConfig } from "../model/CollieConfig.ts";
import { Logger } from "./Logger.ts";

export async function getCurrentWorkingFoundation(
  foundation: string | undefined,
  logger: Logger,
  repo: CollieRepository,
): Promise<string> {
  return foundation ||
    CollieConfig.getFoundation(logger) ||
    (await InteractivePrompts.selectFoundation(repo, logger));
}
