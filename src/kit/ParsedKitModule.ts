import { KitModule } from "./KitModule.ts";

export interface ParsedKitModule {
  /**
   * The id of this module is the relative path from the kit/ directory in the CollieRepository
   */
  id: string;

  /**
   * repository-relative path to the README.md file this module was parsed from
   */
  definitionPath: string;

  /**
   * repository-relative path to the kit module directory
   */
  kitModulePath: string;

  /**
   * the parsed kit module definition
   */
  kitModule: KitModule;

  /**
   * content of the kit module readme
   */
  readme: string;
}
