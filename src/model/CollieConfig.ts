import { Logger } from "../cli/Logger.ts";

export class CollieConfig {
  static CONFIG_FILE_PATH = ".collie/config.json";

  static getFoundation(logger: Logger) {
    try {
      const config = JSON.parse(Deno.readTextFileSync(this.CONFIG_FILE_PATH));
      const foundation = config["foundation"];
      logger.tip(`Foundation ${foundation} is set in ${this.CONFIG_FILE_PATH}`);
      return foundation;
    } catch (e) {
      if (e.name != "NotFound") {
        console.log(e);
      }
    }
  }

  /**
   * This function sets the foundation property in CollieConfig.
   * It does not preserve the order of the keys.
   * @param foundation
   * @param logger
   */
  static async setFoundation(
    foundation: string,
    logger: Logger,
  ) {
    let config;
    try {
      config = JSON.parse(await Deno.readTextFile(this.CONFIG_FILE_PATH));
      config["foundation"] = foundation;
    } catch (error) {
      if (error.name != "NotFound") {
        console.error(error);
      }

      config = { "foundation": foundation };
    }

    Deno.writeTextFile(
      CollieConfig.CONFIG_FILE_PATH,
      JSON.stringify(config),
    );
    logger.progress(
      `set current foundation to ${foundation} in ${CollieConfig.CONFIG_FILE_PATH}`,
    );
  }
}
