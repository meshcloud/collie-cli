import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Input, Select } from "../../deps.ts";
import { emptyKitDirectoryCreation, generatePlatformConfiguration, generateTerragrunt } from "./kit-utilities.ts";
import { InputParameter, InputPromptParameter, InputSelectParameter, KitBundle, KitMetadata, metadataKitFileName } from "./bundles/kitbundle.ts";
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

interface BundleOptions {
  foundation?: string;
  platform?: string;
  //TODO add support for autoapprove
}
export function registerBundledKitCmd(program: TopLevelCommand) {
  program
    .command("bundle <prefix>")
    .option("-f, --foundation <foundation:string>", "foundation")
    .option("-p, --platform <platform:platform>", "platform", {
      depends: ["foundation", "platform"],
    })
    .description(
      "Generate predefined bundled kits to initialize your cloud foundation. [EXPERIMENTAL]\n" +
      "This command will kick off your cloud journey by setting up already ready-to-use kits.\n" +
      "They will be applied directly to your fresh foundation and bootstrap functionality is deployed automatically.\n" +
      "You will be asked for several required parameters in the process."
    )
    .action(async (opts: GlobalCommandOptions & BundleOptions, prefix: string) => {
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

      for (const [name, kitRepr] of allKits) {
        const kitPath = collie.resolvePath("kit", prefix, name);
        logger.progress(`  Creating an new kit structure for ${name}`);
        await emptyKitDirectoryCreation(kitPath, logger);

        logger.progress(`  Downloading kit from ${kitRepr.sourceUrl.length > 50 ? kitRepr.sourceUrl.substring(0, 47) + "..." : kitRepr.sourceUrl}`);
        await kitDownload(kitPath, kitRepr.sourceUrl, kitRepr.sourcePath);

        if (kitRepr.metadataOverride) {
          applyKitMetadataOverride(kitPath, kitRepr.metadataOverride);
        }
      }

      const parametrization = await requestKitBundleParametrization(bundleToSetup.requiredParameters(), logger);
      parametrization.set('__foundation__', foundation);
      parametrization.set('__platform__', platform);

      logger.progress("Calling before-apply hook.");
      bundleToSetup.beforeApply(parametrization);

      for (const [name, _] of allKits) {
        logger.progress(`  Applying kit ${name} to ${foundation} : ${platform}`);
        await applyKit(foundationRepo, platform, logger, path.join(prefix, name));
      }

      logger.progress("Calling after-apply hook.");
      bundleToSetup.afterApply(platformPath, collie.resolvePath("kit", prefix), parametrization);

      const kitsToDeploy = [...allKits.entries()].filter( ([_, kitRepr]) => {
        return kitRepr.deployment
      }).sort(([_name1, kitRepr1], [_name2, kitRepr2]) => {
        return kitRepr1.deployment!.autoDeployOrder - kitRepr2.deployment!.autoDeployOrder
      });

      kitsToDeploy.forEach(async ([name, kitRepr]) => {
        logger.progress(`Auto-deploying: ${name} with order: ${kitRepr.deployment!.autoDeployOrder}`);
        // TODO this is a non-obvious and brittle way to determine if the module is a bootstrap module
        // >> yeah, but we want to know if the module needs to be deployed twice, not if it is a bootstrap module.
        // >> maybe other modules in the future need double-deployment, too.
        const moduleOpts = {
          module: name
        };
        const joinedOpts = {...opts, ...moduleOpts};
        logger.progress("Triggering deployment now.");
        await deployFoundation(collie, foundationRepo, kitRepr.deployment!.deployMode, joinedOpts, logger);
        if (kitRepr.deployment?.needsDoubleDeploy) {
          logger.progress("Calling between-deployments hook.");
          kitRepr.deployment.betweenDoubleDeployments!(platformPath, parametrization);
          logger.progress("Triggering second deployment now.");
          await deployFoundation(collie, foundationRepo, kitRepr.deployment.deployMode, joinedOpts, logger);
        }
      });

      // TODO commented for now: as long as the deploy is commented, this should be commented as well,
      // because there might be a dependency between the two.
      // bundleToSetup.afterDeploy(platformPath, parametrization);
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
    // for idempotency of this function, return early here
    return;
  }

  Deno.writeTextFileSync(fileToUpdate, `${metadataHeader}\n${existingText}`);
}

// TODO show confirmation dialog and ask user if ok or restart
async function requestKitBundleParametrization(parameters: InputParameter[], logger: Logger): Promise<Map<string,string>> {
  logger.progress("\n  Please configure your kit bundle with the required arguments.");
  const answers = new Map<string, string>();

  for (const parameter of parameters) {
    const answer = await promptUserInput(parameter);
    answers.set(parameter.description, answer);
  }

  return answers;
}

async function promptUserInput(inputParameter: InputParameter): Promise<string> {
    const message = `Define a value for parameter: ${inputParameter.description}`;
    if (isSelect(inputParameter)) {
      return await Select.prompt({
        message,
        options: inputParameter.options,
      });
    } else {
      return await Input.prompt({
        message,
        hint: inputParameter.hint,
        validate: (s) => {
          if (s.match(inputParameter.validationRegex)) {
            return true;
          }
          return inputParameter.validationFailureMessage;
        },
      });
    }
}

function isSelect(inputParameter: InputParameter): inputParameter is InputSelectParameter {
  return (inputParameter as InputSelectParameter).options !== undefined;
}