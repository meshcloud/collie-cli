import { InteractivePrompts } from "./InteractivePrompts.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { CollieConfig } from "../model/CollieConfig.ts";
import { Logger } from "./Logger.ts";

/**
 * Determine the foundation for a CLI command.
 * Order of preference param foundation > config property foundation > interactive prompt
 */
export async function getCurrentWorkingFoundation(
  foundation: string | undefined,
  logger: Logger,
  repo: CollieRepository,
) {
  if (foundation) {
    return foundation;
  } else {
    const config = new CollieConfig(repo, logger);

    return config.getProperty("foundation") ||
      (await InteractivePrompts.selectFoundation(repo, logger));
  }
}
