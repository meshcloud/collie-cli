import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Input, Select } from "../../deps.ts";
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
    .description(
      "Generate predefined bundled kits to initialize your cloud foundation. [EXPERIMENTAL]\n" +
      "This command will kick off your cloud journey by setting up already ready-to-use kits.\n" +
      "They will be applied directly to your fresh foundation and bootstrap functionality is deployed automatically.\n" +
      "You will be asked for several required parameters in the process."
    )
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

      const parametrization = await requestKitBundleParametrization(bundleToSetup.requiredParameters(), logger);

      logger.progress("Calling before-apply hook.");
      bundleToSetup.beforeApply(parametrization);

      for await (const [name, _] of allKits) {
        logger.progress(`  Applying kit ${name} to ${foundation} : ${platform}`);
        await applyKit(foundationRepo, platform, logger, path.join(prefix, name));
      }

      logger.progress("Calling after-apply hook.");
      bundleToSetup.afterApply(platformPath, parametrization);

      if (!await confirmCloudCosts()) {
        logger.progress("Aborting here.");
        return;
      }

      const kitsToDeploy = [...allKits.entries()].filter( ([_, kitRepr]) => {
        return kitRepr.deployment
      }).sort(([_name1, kitRepr1], [_name2, kitRepr2]) => {
        return kitRepr1.deployment!.autoDeployOrder - kitRepr2.deployment!.autoDeployOrder
      });

      const mode = { raw: ["plan"] }; // FIXME we use plan instead of apply while we're still testing.

      kitsToDeploy.forEach(async ([name, kitRepr]) => {
        logger.progress(`Auto-deploying: ${name} with order: ${kitRepr.deployment!.autoDeployOrder}`);
        // HINT: for second deployment every info should be contained in kitRepr.deployment : KitDeployRepresentation

        // TODO this is a non-obvious and brittle way to determine if the module is a bootstrap module
        const bootstrapOpts = {
          bootstrap: kitRepr.deployment?.needsDoubleDeploy
        };
        const optsWithBootstrap = {...opts, ...bootstrapOpts};
        // TODO deployment is commented for now, some TODOs are open before this can be used.
        // await deployFoundation(collie, foundationRepo, mode, optsWithBootstrap, logger);
        // if (kitRepr.deployment?.needsDoubleDeploy) {
        //   kitRepr.deployment.betweenDoubleDeployments!(platformPath, parametrization);
        //   await deployFoundation(collie, foundationRepo, kitRepr.deployment.secondDeploymentArgs, opts, logger);
        // }
      });

      logger.progress("Calling after-deploy hook.");
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
async function requestKitBundleParametrization(parameters: string[], logger: Logger): Promise<Map<string,string>> {
  logger.progress("\n  Please configure your kit bundle with the required arguments.");
  const answers = new Map<string, string>();
  const inputRegex = /^[a-zA-Z0-9_.-@#]+$/;  //TODO validate that this is sufficient

  for (const parameter of parameters) {
    const answer = await Input.prompt({
      message: `Define a value for parameter: ${parameter}`,
      //hint: "", //TODO think about adding a hint to required parameters, would be way better UX!
      validate: (s) => {
        if (s.match(inputRegex)) {
          return true;
        }

        return "only alphanumeric characters, '-', '_' and '.' are allowed";
      },
    });
    answers.set(parameter, answer);
  }

  return answers
}

async function confirmCloudCosts(): Promise<boolean> {
  const answer = await Input.prompt({
    message: `You are about to set up a minimum set of cloud resources. This could induce some costs at your cloud provider.\n Type "yes", if you agree.`,
    validate: (_) => {return true},
  });
  const input = answer.toLocaleLowerCase();
  return (input === 'yes' || input === 'y');
}