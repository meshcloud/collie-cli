import { Logger } from "../cli/Logger.ts";

export class CollieConfig {
  static CONFIG_FILE_PATH = ".collie/config.json";
  
  static read_foundation(logger: Logger) {
    try {
      const config = JSON.parse(Deno.readTextFileSync(this.CONFIG_FILE_PATH))
      const foundation = config["foundation"]
      logger.tip(`Foundation ${foundation} is set in ${this.CONFIG_FILE_PATH}`)
      return foundation
    } catch (e) {
      if (e.name != "NotFound")
        console.log(e)
    }
  }
}