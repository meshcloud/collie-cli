import { pooledMap } from "std/async";

import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { Logger } from "../../cli/Logger.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { KitModuleRepository } from "../../kit/KitModuleRepository.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { ProgressReporter } from "../../cli/ProgressReporter.ts";
import { MeshError, ProcessRunnerError } from "../../errors.ts";

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
      const factory = new CliApiFacadeFactory(collie, logger);
      const tf = factory.buildTerraform();
      const tfDocs = factory.buildTerraformDocs();

      const modules = moduleRepo.all.filter((x) => !module || module == x.id);

      // collect all errors
      const errors: ProcessRunnerError[] = [];

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

          if (error instanceof ProcessRunnerError) {
            errors.push(error);
            return;
          } else {
            throw error;
          }
        }

        moduleProgress.done();
      });

      try {
        for await (const _ of iterator) {
          // consume iterator
        }
      } catch (_) {
        // catch all is fine since the map function captures all errors
      }

      if (errors.length) {
        errors.forEach((x) => {
          logger.error(x.message);
        });

        throw new MeshError("validating kit modules failed");
      }

      kitProgress.done();
    });
}
