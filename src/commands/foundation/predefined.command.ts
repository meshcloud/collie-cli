import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Select } from "../../deps.ts";
import { MeshError } from "../../errors.ts";

export function registerPredefinedCmd(program: TopLevelCommand) {
  program
    .command("predefined <foundation:foundation>")
    .description("generate a predefined cloud foundation")
    .action(async (opts: GlobalCommandOptions, foundation: string) => {
      const repo = await CollieRepository.load();
      const logger = new Logger(repo, opts);

      logger.progress("Choosing a predefined foundation.");
      const option = await promptPredefinedFoundationOption(foundation);      
      logger.progress(`'${option}' chosen for '${foundation}'.`);

      // TODO now we can get going here.
      // rough plan:
      // create a new foundation
      // download TF modules from selected predefined foundation (currently only Azure CAF ES related)
      // create one bootstrap kit
      // create another kit with the actual LZ resources (maybe even split it into multiple kits, probly not for first version)
      // request config variables from user that are required
      // apply all new kits to foundation
      // done, deployment works as usual with '$ collie foundation deploy <foundation>' 

    });
}

async function promptPredefinedFoundationOption(name: string) {
  switch (
    await Select.prompt({
      message: `Select the predefined Foundation you want to use for ${name}:`,
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
