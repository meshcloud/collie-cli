import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Select } from "../../deps.ts";
import { MeshError } from "../../errors.ts";
import { kitDirectoryCreation } from "./kit-creation.ts";

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
      const moduleBasePath = collie.resolvePath("kit", `${prefix}-base`);

      await kitDirectoryCreation(moduleBootstrapPath, `${prefix}-bootstrap`, logger);
      await kitDirectoryCreation(moduleBasePath, `${prefix}-base`, logger);
    });
}

async function promptKitBundleOption() {
  switch (
    await Select.prompt({
      message: `Select the predefined Foundation you want to use:`,
      options: [
        { name: "Azure Enterprise Scale", value: "AZURE CAF ES" },
        { name: "Quit", value: "Quit" },
      ],
    })
  ) {
    case "AZURE CAF ES": {
      console.clear();
      return "Azure Enterprise Scale";
    }
    case "Quit": {
      Deno.exit();
      break;
    }
    default: {
      throw new MeshError("Invalid value. Something went horribly wrong.");
    }
  }
}
