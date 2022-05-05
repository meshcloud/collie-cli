import { KitModule } from "./KitModule.ts";

export interface ParsedKitModule {
  /**
   * The id of this module is the kit-relative path to directory of the kit module
   */
  id: string;

  /**
   * kit-relative path to the README.md file this module was parsed from
   */
  definitionPath: string;

  /**
   * the parsed kit module definition
   */
  kitModule: KitModule;

  /**
   * content of the kit module readme
   */
  readme: string;
}
