import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Select } from "../../deps.ts";
import { emptyKitDirectoryCreation, generatePlatformConfiguration, generateTerragrunt } from "./kit-utilities.ts";
import { KitBundle, KitMetadata, KitRepresentation, metadataKitFileName } from "./bundles/kitbundle.ts";
import { kitDownload } from "./kit-download.ts";
import { AzureKitBundle } from "./bundles/azure-caf-es.ts";
import { SelectValueOptions } from "https://deno.land/x/cliffy@v0.25.1/prompt/select.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { Dir, DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";

const availableKitBundles: KitBundle[] = [
  new AzureKitBundle("azure-caf-es", "Azure Enterprise Scale")
];

interface ApplyOptions {
  foundation?: string;
  platform?: string;
}
export function registerBundledKitCmd(program: TopLevelCommand) {
  program
    .command("bundle <prefix>")
    .option("-f, --foundation <foundation:string>", "foundation")
    .option("-p, --platform <platform:platform>", "platform", {
      depends: ["foundation", "platform"],
    })
    .description("Generate predefined bundled kits for your cloud foundation")
    .action(async (opts: GlobalCommandOptions & ApplyOptions, prefix: string) => {
      const collie = new CollieRepository("./");
      const logger = new Logger(collie, opts);
      const validator = new ModelValidator(logger);

      const foundation = opts.foundation ||
        (await InteractivePrompts.selectFoundation(collie));

      const foundationRepo = await FoundationRepository.load(
        collie,
        foundation,
        validator,
      );

      const platform = opts.platform ||
        (await InteractivePrompts.selectPlatform(foundationRepo));

      logger.progress("Choosing a predefined bundled kit.");
      const bundleToSetup = await promptKitBundleOption();
      logger.progress(`Bundle '${bundleToSetup.displayName}' ('${bundleToSetup.identifier}') chosen.`);

      const allKits = bundleToSetup.kitsAndSources();

      /**
       * For each kit of the bundle:
       * 1. Create a kit folder
       * 2. Download the kit sources from github (or other URL)
       * 3. Apply kit to foundation + platform selection
       * 4. Configure required variables for kit
       */
       allKits.forEach(async (kitRepr: KitRepresentation, name: string) => {

        const kitPath = collie.resolvePath("kit", prefix, name);
        logger.progress(`  Creating an new kit structure for ${name}`);
        emptyKitDirectoryCreation(kitPath, logger);

        logger.progress(`  Downloading kit from ${kitRepr.sourceUrl.length > 50 ? kitRepr.sourceUrl.substring(0, 47) + "..." : kitRepr.sourceUrl}`);
        await kitDownload(kitPath, kitRepr.sourceUrl, kitRepr.sourcePath, logger);

        if (kitRepr.metadataOverride) {
          applyKitMetadataOverride(kitPath, kitRepr.metadataOverride);
        }

        logger.progress(`  Applying kit ${name} to ${foundation} : ${platform}`);
        applyKit(foundationRepo, platform, logger, name);

        // TODO 4. Configure required variables for kit
      });

      
      // TODO yeah, make it readable
      [...allKits.entries()]
        .filter( (v,_) => v[1].autoDeployOrder !== undefined )
        .sort((a,b) => a[1].autoDeployOrder! - b[1].autoDeployOrder!)
        .forEach(v => {
          const name = v[0];
          const kitRepr = v[1];
          // TODO autoDeploy here instead of logging
          console.log(`Auto-deploying: ${name} with order: ${kitRepr.autoDeployOrder}`);

        });  
    });
}

async function promptKitBundleOption(): Promise<KitBundle> {

  const bundleOptions: SelectValueOptions = availableKitBundles.map((x) => ({ name: x.displayName, value: x.identifier }));
  bundleOptions.push({ name: "Quit", value: "quit" });

  const selectedOption = await Select.prompt({
    message: "Select the predefined Foundation you want to use:",
    options: bundleOptions,
  });
  if (selectedOption === 'quit') {
    Deno.exit(1);
  } else {
    return availableKitBundles.find(x => x.identifiedBy(selectedOption))!;
  }
}

async function applyKit(foundationRepo: FoundationRepository, platform: string, logger: Logger, kitName: string) {
  const dir = new DirectoryGenerator(WriteMode.skip, logger);
  const collie = new CollieRepository("./");
  const platformConfig = foundationRepo.findPlatform(platform);

  generatePlatformConfiguration(foundationRepo, platformConfig, dir);

  const platformModuleId = kitName.split("/").slice(1);
  const targetPath = foundationRepo.resolvePlatformPath(
    platformConfig,
    ...platformModuleId,
  );

  const kitModulePath = collie.relativePath(
    collie.resolvePath("kit", kitName),
  );
  const platformModuleDir: Dir = {
    name: targetPath,
    entries: [
      {
        name: "terragrunt.hcl",
        content: generateTerragrunt(kitModulePath),
      },
    ],
  };

  await dir.write(platformModuleDir, "");
}

// FIXME err handling missing, seems not to work atm?
function applyKitMetadataOverride(kitPath: string, metadata: KitMetadata) {  
  const fileToUpdate = path.join(kitPath, metadataKitFileName);  
  const metadataHeader = `---
name: ${metadata.name}
summary: |
  ${metadata.description}
---
  `;

  const existingText = Deno.readTextFileSync(fileToUpdate);  
  if (existingText.startsWith("---")) {
    // TODO could be improved
    // for idenpotency of this function, return early here
    return;
  }

  Deno.writeTextFileSync(fileToUpdate, metadataHeader);
  Deno.writeTextFileSync(fileToUpdate, `\n${existingText}`, {append: true});
}