import { pooledMap } from "std/async";

import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { Logger } from "../../cli/Logger.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { MeshError } from "../../errors.ts";

// limit concurrency
const concurrencyLimit = navigator.hardwareConcurrency;

export function registerCompileCmd(program: TopLevelCommand) {
  program
    .command("compile [module]")
    .description(
      "Compile kit modules, validating their terraform and updating documentation",
    )
    .action(async (opts: GlobalCommandOptions, module?: string) => {
      const collie = await CollieRepository.load();
      const logger = new Logger(collie, opts);
      const validator = new ModelValidator(logger);
      const moduleRepo = await KitModuleRepository.load(
        collie,
        validator,
        logger,
      );

      const kitProgress = new ProgressReporter("compiling", "kit", logger);

      // todo: should compiling a kit module also run tflint and other stuff?
      const factory = new CliApiFacadeFactory(logger);
      const tf = factory.buildTerraform();
      const tfDocs = factory.buildTerraformDocs(collie);

      const modules = moduleRepo.all.filter((x) => !module || module == x.id);

      const iterator = pooledMap(concurrencyLimit, modules, async (x) => {
        const moduleProgress = new ProgressReporter(
          "compiling",
          x.kitModulePath,
          logger,
        );

        try {
          await tfDocs.updateReadme(x.kitModulePath);

          const resolvedKitModulePath = collie.resolvePath(x.kitModulePath);

          // for checking we need to no locks (they only confuse tfdocs) and also no backend providers
          await tf.init(resolvedKitModulePath, { backend: false });
          await tf.validate(resolvedKitModulePath);
        } catch (error) {
          moduleProgress.failed();

          // log then throw is typically an anti-pattern, but its fine here
          // since an error here will end up as an AggregateError later below
          logger.error(
            (_) =>
              `encountered error compiling kit module ${x.kitModulePath}\n${error}`,
          );

          throw error;
        }

        moduleProgress.done();
      });

      try {
        for await (const _ of iterator) {
          // consume iterator
        }
      } catch (ex) {
        if (ex instanceof AggregateError) {
          // exiting here is fine since the map function logs all erors
          throw new MeshError("validating kit modules failed");
        }

        throw ex;
      }

      kitProgress.done();
    });
}
