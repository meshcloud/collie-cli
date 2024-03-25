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
): Promise<string> {
  // user explicitly set the foundation to use
  if (foundation) {
    return foundation;
  }

  // the repo only contains a single foundation anyway, no need to select one
  const foundations = await repo.listFoundations();
  if (foundations.length === 1) {
    return foundations[0];
  }

  // check if a foundation was set in config, otherwise prompt interactively
  const config = new CollieConfig(repo, logger);

  return config.getProperty("foundation") ||
    (await InteractivePrompts.selectFoundation(repo, logger));
}
