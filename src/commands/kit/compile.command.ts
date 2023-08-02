import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { Logger } from "../../cli/Logger.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";

export function registerCompileCmd(program: TopLevelCommand) {
  program
    .command("compile [module]")
    .description("Compile kit modules, updating their documentation")
    .action(async (opts: GlobalCommandOptions, module?: string) => {
      const collie = await CollieRepository.load();
      const logger = new Logger(collie, opts);
      const validator = new ModelValidator(logger);
      const moduleRepo = await KitModuleRepository.load(
        collie,
        validator,
        logger,
      );

      const progress = new ProgressReporter(
        "compiling",
        "kit modules",
        logger,
      );

      // todo: should compiling a kit module also run tflint and other stuff?
      const factory = new CliApiFacadeFactory(collie, logger);
      const tfDocs = factory.buildTerraformDocs();

      const tasks = moduleRepo.all
        .filter((x) => !module || module == x.id)
        .map(async (x) => await tfDocs.updateReadme(x.kitModulePath));

      await Promise.all(tasks);

      progress.done();
    });
}
