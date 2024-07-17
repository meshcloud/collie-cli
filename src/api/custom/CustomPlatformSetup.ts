import { Input, Select } from "x/cliffy/prompt";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { PlatformConfigCustom } from "../../model/PlatformConfig.ts";
import { CustomCliFacade } from "./CustomCliFacade.ts";
import { Dir } from "../../cli/DirectoryGenerator.ts";
import { CLI } from "../../info.ts";
import { PlatformSetup } from "../PlatformSetup.ts";
import { isWindows } from "../../os.ts";

export class CustomPlatformSetup extends PlatformSetup<PlatformConfigCustom> {
   constructor(private readonly custom: CustomCliFacade) {
      super();
   }

   async promptInteractively(): Promise<PlatformConfigCustom> {

   const { id, name, type } = await this.promptPlatformName();

   const identity = await this.custom.getCallerIdentity;

   return {
      id,
      name,
      custom: "type",
   };
}

preparePlatformDir(config: PlatformConfigCustom): Dir {
   return {
      name: config.id,
      entries: [
         { name: "README.md", content: this.generateCustomReadmeMd(config) },
      ],
   };
}

private generateCustomReadmeMd(config: PlatformConfigCustom): string {
   const frontmatter = config;
   const md = `
# ${config.name}

This is a custom platform.
`;

   const doc = new MarkdownDocument(frontmatter, md);

   return doc.format();
   }
}
