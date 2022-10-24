import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Select } from "../../deps.ts";
import { emptyKitDirectoryCreation, generatePlatformConfiguration, generateTerragrunt } from "./kit-utilities.ts";
import { KitBundle, KitMetadata, metadataKitFileName } from "./bundles/kitbundle.ts";
import { kitDownload } from "./kit-download.ts";
import { AzureKitBundle } from "./bundles/azure-caf-es.ts";
import { SelectValueOptions } from "https://deno.land/x/cliffy@v0.25.1/prompt/select.ts";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import { Dir, DirectoryGenerator, WriteMode } from "../../cli/DirectoryGenerator.ts";
import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { deployFoundation } from "../foundation/deploy.command.ts";

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

      const platformPath = collie.resolvePath("foundations", foundation, "platforms", platform);

      logger.progress("Choosing a predefined bundled kit.");
      const bundleToSetup = await promptKitBundleOption();
      logger.progress(`Bundle '${bundleToSetup.displayName}' ('${bundleToSetup.identifier}') chosen.`);

      const allKits = bundleToSetup.kitsAndSources();

      for await (const [name, kitRepr] of allKits) {
        const kitPath = collie.resolvePath("kit", prefix, name);
        logger.progress(`  Creating an new kit structure for ${name}`);
        emptyKitDirectoryCreation(kitPath, logger);

        logger.progress(`  Downloading kit from ${kitRepr.sourceUrl.length > 50 ? kitRepr.sourceUrl.substring(0, 47) + "..." : kitRepr.sourceUrl}`);
        await kitDownload(kitPath, kitRepr.sourceUrl, kitRepr.sourcePath);

        if (kitRepr.metadataOverride) {
          applyKitMetadataOverride(kitPath, kitRepr.metadataOverride);
        }
      }

      // TODO this needs to be queried from console input!
      const parametrization: Map<string,string> = new Map();

      logger.progress("Calling before-apply hook.");
      bundleToSetup.beforeApply(parametrization);

      for await (const [name, _] of allKits) {
        logger.progress(`  Applying kit ${name} to ${foundation} : ${platform}`);
        await applyKit(foundationRepo, platform, logger, path.join(prefix, name));
      }

      logger.progress("Calling after-apply hook.");
      bundleToSetup.afterApply(platformPath, parametrization);

      // TODO deploy needs to be called twice sometimes, with a hook in between. sync how we can archieve this

      const kitsToDeploy = [...allKits.entries()].filter( ([_, kitRepr]) => {
        return kitRepr.deployment
      }).sort(([_name1, kitRepr1], [_name2, kitRepr2]) => {
        return kitRepr1.deployment!.autoDeployOrder - kitRepr2.deployment!.autoDeployOrder
      });

      const mode = { raw: ["plan"] };

      kitsToDeploy.forEach(([name, kitRepr]) => {
        logger.progress(`Auto-deploying: ${name} with order: ${kitRepr.deployment!.autoDeployOrder}`);
        // HINT: for second deployment every info should be contained in kitRepr.deployment : KitDeployRepresentation

        // commented for now, some TODOs are open before this can be used.
        // deployFoundation(collie, foundationRepo, mode, opts, logger)
        // TODO single deploy is not sufficient for bootstrap modules: after the bucket is created, a second
        // deploy is required which makes use of this bucket.
      });

      logger.progress("Calling after-deploy hook.");
      bundleToSetup.afterDeploy(platformPath, parametrization);
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

// TODO err handling missing
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

  Deno.writeTextFileSync(fileToUpdate, `${metadataHeader}\n${existingText}`);
}