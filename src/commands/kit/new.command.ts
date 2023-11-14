import { Input } from "x/cliffy/prompt";
import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { newKitDirectoryCreation } from "./kit-utilities.ts";
import { ValidationError } from "x/cliffy/command";
import { validateIsPrefixedId } from "../../cli/validation.ts";

const idValidationMessage =
  "Kit module ids must contain a prefix for a platform like 'platform/module'";

export function registerNewCmd(program: TopLevelCommand) {
  program
    .command("new <module> [name]")
    .description(
      `Generate a new kit module terraform template.\n${idValidationMessage}`,
    )
    .action(
      async (opts: GlobalCommandOptions, module: string, name?: string) => {
        if (!validateIsPrefixedId(module)) {
          throw new ValidationError(idValidationMessage);
        }

        const collie = await CollieRepository.load();
        const logger = new Logger(collie, opts);

        const modulePath = collie.resolvePath("kit", module);
        name = name ||
          (await Input.prompt({
            message: `Choose a human-friendly name for this module`,
            default: module,
            minLength: 1,
          }));

        await newKitDirectoryCreation(modulePath, name, logger);

        logger.progress(
          "generated new kit module at " +
            collie.relativePath(collie.resolvePath("kit", module, "README.md")),
        );

        logger.tip(
          "add terraform code to your kit module at " +
            collie.relativePath(collie.resolvePath("kit", module, "main.tf")),
        );
      },
    );
}
