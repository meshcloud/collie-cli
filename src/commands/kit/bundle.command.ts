import { Logger } from "../../cli/Logger.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { Input, Select } from "../../deps.ts";
import {
  emptyKitDirectoryCreation,
  generateDocumentationTf,
  generatePlatformConfiguration,
  generateTerragrunt,
} from "./kit-utilities.ts";
import {
  KitBundle,
  KitMetadata,
  metadataKitFileName,
} from "./bundles/kitbundle.ts";
import { kitDownload } from "./kit-download.ts";
import { AzureKitBundle } from "./bundles/azure-caf-es.ts";
import { AzureKitMeshstackIntegrationBundle } from "./bundles/azure-caf-es-with-meshplatform.ts";
import { SelectValueOptions } from "x/cliffy/prompt";
import { FoundationRepository } from "../../model/FoundationRepository.ts";
import { InteractivePrompts } from "../interactive/InteractivePrompts.ts";
import { ModelValidator } from "../../model/schemas/ModelValidator.ts";
import {
  Dir,
  DirectoryGenerator,
  WriteMode,
} from "../../cli/DirectoryGenerator.ts";
import { path } from "https://deno.land/x/compress@v0.3.3/deps.ts";
import { deployFoundation } from "../foundation/deploy.command.ts";
import { Toggle } from "https://deno.land/x/cliffy@v0.25.1/prompt/mod.ts";
import cliFormat from "https://raw.githubusercontent.com/zongwei007/cli-format-deno/v3.x/src/mod.ts";
import { InputParameter, InputSelectParameter } from "../InputParameter.ts";
import { CliApiFacadeFactory } from "../../api/CliApiFacadeFactory.ts";
import { AzLocation } from "../../api/az/Model.ts";

function availableKitBundles(locations: AzLocation[]): KitBundle[] {
  return [
    new AzureKitBundle(locations),
    new AzureKitMeshstackIntegrationBundle(locations),
  ];
}

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
        "You will be asked for several required parameters in the process.",
    )
    .action(
      async (opts: GlobalCommandOptions & BundleOptions, prefix: string) => {
        const collie = new CollieRepository("./");
        const logger = new Logger(collie, opts);
        const validator = new ModelValidator(logger);

        const factory = new CliApiFacadeFactory(collie, logger);
        const az = factory.buildAz();
        const locations = (await az.listLocations())
          // only physical regions  (like "germanywestcentral") should be selectable,
          // but no logical regions (like "germany").
          .filter((location: AzLocation) =>
            location.metadata.regionType === "Physical"
          )
          .sort((location1, location2) => {
            // this is effectively a "thenBy" sort, see https://stackoverflow.com/a/9175783/125407
            // The intent is to have those locations that are used most frequently by our customers
            // appear at the top, so the user won't have to scroll too far.
            return cmpByGeographyGroup(location1, location2) ||
              cmpByLocation(location1, location2) ||
              cmp(location1.name, location2.name);
          });

        const foundation = opts.foundation ||
          (await InteractivePrompts.selectFoundation(collie));

        const foundationRepo = await FoundationRepository.load(
          collie,
          foundation,
          validator,
        );

        const platform = opts.platform ||
          (await InteractivePrompts.selectPlatform(foundationRepo));

        const platformPath = collie.resolvePath(
          "foundations",
          foundation,
          "platforms",
          platform,
        );

        let confirm = false;
        let bundleToSetup: KitBundle | undefined = undefined;
        while (!confirm) {
          logger.progress("Choosing a predefined bundled kit.");
          bundleToSetup = await promptKitBundleOption(locations);
          logger.progress(
            `Bundle '${bundleToSetup.displayName}' ('${bundleToSetup.identifier}') chosen.`,
          );
          console.log(
            cliFormat.wrap(bundleToSetup.description, { paddingLeft: "  " }),
          );
          confirm = await Toggle.prompt(`Continue?`);
        }

        bundleToSetup = bundleToSetup!;
        const allKits = bundleToSetup!.kitsAndSources();

        for (const [name, kitRepr] of allKits) {
          const kitPath = collie.resolvePath("kit", prefix, name);
          logger.progress(`Creating an new kit structure for ${name}`);
          await emptyKitDirectoryCreation(kitPath, logger);

          logger.progress(
            `Downloading kit from ${
              kitRepr.sourceUrl.length > 50
                ? kitRepr.sourceUrl.substring(0, 47) + "..."
                : kitRepr.sourceUrl
            }`,
          );
          await kitDownload(kitPath, kitRepr.sourceUrl, kitRepr.sourcePath);

          if (kitRepr.metadataOverride) {
            applyKitMetadataOverride(kitPath, kitRepr.metadataOverride);
          }

          applyKitDocumentationTf(kitPath, kitRepr.documentationContent);
        }

        const parametrization = await requestKitBundleParametrization(
          bundleToSetup.requiredParameters(),
          logger,
        );
        parametrization.set("__foundation__", foundation);
        parametrization.set("__platform__", platform);

        logger.progress("Calling before-apply hook.");
        bundleToSetup.beforeApply(parametrization);

        for (const [name, _] of allKits) {
          logger.progress(
            `Applying kit ${name} to ${foundation} : ${platform}`,
          );
          await applyKit(
            foundationRepo,
            platform,
            logger,
            path.join(prefix, name),
          );
        }

        logger.progress("Calling after-apply hook.");
        bundleToSetup.afterApply(
          platformPath,
          collie.resolvePath("kit", prefix),
          parametrization,
        );

        const kitsToDeploy = [...allKits.entries()].filter(([_, kitRepr]) => {
          return kitRepr.deployment;
        }).sort(([_name1, kitRepr1], [_name2, kitRepr2]) => {
          return kitRepr1.deployment!.autoDeployOrder -
            kitRepr2.deployment!.autoDeployOrder;
        });

        kitsToDeploy.forEach(async ([name, kitRepr]) => {
          logger.progress(
            `Auto-deploying: ${name} with order: ${
              kitRepr.deployment!.autoDeployOrder
            }`,
          );
          // TODO this is a non-obvious and brittle way to determine if the module is a bootstrap module
          // >> yeah, but we want to know if the module needs to be deployed twice, not if it is a bootstrap module.
          // >> maybe other modules in the future need double-deployment, too.
          const moduleOpts = {
            module: name,
          };
          const joinedOpts = { ...opts, ...moduleOpts };
          logger.progress("Triggering deployment now.");
          await deployFoundation(
            collie,
            foundationRepo,
            kitRepr.deployment!.deployMode,
            joinedOpts,
            logger,
          );
          if (kitRepr.deployment?.needsDoubleDeploy) {
            logger.progress("Calling between-deployments hook.");
            kitRepr.deployment.betweenDoubleDeployments!(
              platformPath,
              parametrization,
            );
            logger.progress("Triggering second deployment now.");
            await deployFoundation(
              collie,
              foundationRepo,
              kitRepr.deployment.deployMode,
              joinedOpts,
              logger,
            );
          }
        });

        // TODO commented for now: as long as the deploy is commented, this should be commented as well,
        // because there might be a dependency between the two.
        // bundleToSetup.afterDeploy(platformPath, parametrization);
      },
    );
}

async function promptKitBundleOption(
  locations: AzLocation[],
): Promise<KitBundle> {
  const kitBundles = availableKitBundles(locations);
  const bundleOptions: SelectValueOptions = kitBundles.map((x) => ({
    name: x.displayName,
    value: x.identifier,
  }));
  bundleOptions.push({ name: "Quit", value: "quit" });

  const selectedOption = await Select.prompt({
    message: "Select the predefined Foundation you want to use:",
    options: bundleOptions,
  });
  if (selectedOption === "quit") {
    Deno.exit();
  } else {
    return kitBundles.find((x) => x.identifiedBy(selectedOption))!;
  }
}

async function applyKit(
  foundationRepo: FoundationRepository,
  platform: string,
  logger: Logger,
  kitName: string,
) {
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

async function applyKitDocumentationTf(
  kitPath: string,
  content: string | undefined,
) {
  const documentationTfFile = path.join(kitPath, "documentation.tf");
  try {
    await Deno.stat(documentationTfFile);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      Deno.writeTextFileSync(
        path.join(kitPath, "documentation.tf"),
        generateDocumentationTf(content),
      );
    }
  }
}

// TODO show confirmation dialog and ask user if ok or restart
async function requestKitBundleParametrization(
  parameters: Map<string, InputParameter[]>,
  logger: Logger,
): Promise<Map<string, string>> {
  let retry = true;
  const answers = new Map<string, string>();
  while (retry) {
    retry = false;
    logger.progress(
      "\nPlease configure your kit bundle with the required arguments.",
    );

    for (const kitName of parameters.keys()) {
      logger.progress(`Now configuring kit: ${kitName}`);
      const params = parameters.get(kitName)!;
      for (const parameter of params) {
        const answer = await promptUserInput(parameter);
        answers.set(parameter.description, answer);
      }
    }

    logger.progress("You configured the kit bundle as follows:");
    for (const [k, v] of answers) {
      logger.progress(`  ${k}: ${v}`);
    }

    const message = "Are the configured values correct?";
    const confirmation = await Select.prompt({
      message,
      options: [
        { name: "Yes", value: "y" },
        { name: "Reiterate", value: "r" },
        { name: "Quit", value: "q" },
      ],
    });
    if (confirmation === "q") {
      Deno.exit();
    } else if (confirmation === "r") {
      retry = true;
      answers.clear();
    }
  }

  return answers;
}

async function promptUserInput(
  inputParameter: InputParameter,
): Promise<string> {
  const message = `Define a value for parameter: ${inputParameter.description}`;
  if (isSelect(inputParameter)) {
    return await Select.prompt({
      message,
      hint: inputParameter.hint,
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

function isSelect(
  inputParameter: InputParameter,
): inputParameter is InputSelectParameter {
  return (inputParameter as InputSelectParameter).options !== undefined;
}

function cmpByGeographyGroup(a: AzLocation, b: AzLocation): number {
  // The order should reflect the geography groups used most often by our customers, i.e., if A appears
  // before B in this list, then we assume that A is used more often by our customers than B.
  const geographyGroupsOrdered = [
    "Europe",
    "US",
    "Canada",
    "Asia Pacific",
    "Middle East",
    "South America",
    "Africa",
    null,
  ];
  return cmp(
    indexOrInfinity(geographyGroupsOrdered, a.metadata.geographyGroup),
    indexOrInfinity(geographyGroupsOrdered, b.metadata.geographyGroup),
  );
}

function cmpByLocation(a: AzLocation, b: AzLocation): number {
  // The order should reflect the locations used most often by our customers, i.e., if A appears
  // before B in this list, then we assume that A is used more often by our customers than B.
  const physicalLocationsOrdered = [
    "Frankfurt",
    "Berlin",
    null,
  ];
  return cmp(
    indexOrInfinity(physicalLocationsOrdered, a.metadata.physicalLocation),
    indexOrInfinity(physicalLocationsOrdered, b.metadata.physicalLocation),
  );
}

function indexOrInfinity<T>(items: T[], item: T): number {
  const idx = items.indexOf(item);
  // Returning Infinity so the result can be used for sorting: items that were not found
  // should appear last if we sort in ascending order.
  return idx === -1 ? Infinity : idx;
}

// deno-lint-ignore no-explicit-any
function cmp(a: any, b: any): number {
  if (a > b) {
    return +1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}
