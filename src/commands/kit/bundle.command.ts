import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Select } from "../../deps.ts";
import { emptyKitDirectoryCreation } from "./kit-creation.ts";
import { KitBundle } from "./bundles/kitbundle.ts";
import { AzureKitBundle } from "./bundles/azure-caf-es.ts";

const availableKitBundles: KitBundle[] = [
  new AzureKitBundle("azure-caf-es", "Azure Enterprise Scale")
]; 

export function registerBundledKitCmd(program: TopLevelCommand) {
  program
    .command("bundle <prefix>")
    .description("Generate predefined bundled kits for your cloud foundation")
    .action(async (opts: GlobalCommandOptions, prefix: string) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);

      logger.progress("Choosing a predefined bundled kit.");
      const option = await promptKitBundleOption();      
      logger.progress(`'${option}' chosen.`);

      // TODO now we can get going here.
      // rough plan:
      // download TF modules from selected predefined foundation (currently only Azure CAF ES related)
      // create one bootstrap kit named: "<prefix>-bootstrap"
      // create another kit "<prefix>-base" with the actual LZ resources (maybe even split it into multiple kits, probly not for first version)
            
      // request config variables from user that are required
      // apply all new kits to foundation
      // done, deployment works as usual with '$ collie foundation deploy <foundation>' 

      const moduleBootstrapPath = collie.resolvePath("kit", `${prefix}-bootstrap`);
      await emptyKitDirectoryCreation(moduleBootstrapPath, logger);

      const moduleBasePath = collie.resolvePath("kit", `${prefix}-base`);
      await emptyKitDirectoryCreation(moduleBasePath, logger);

    });
}

async function promptKitBundleOption() {
  await Select.prompt({
    message: "Select the predefined Foundation you want to use:",
    options: (
      availableKitBundles
    ).map((x) => ({ name: x.displayName, value: x.identifier })),
  });
}
