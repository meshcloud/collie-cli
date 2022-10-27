import { SelectValueOptions } from "https://deno.land/x/cliffy@v0.25.1/prompt/select.ts";
import { TerragruntArguments } from "../../../api/terragrunt/TerragruntCliFacade.ts";

export abstract class KitBundle {
  identifier: string;
  displayName: string;
  description: string;

  constructor(identifier: string, displayName: string, description: string) {
    this.identifier = identifier;
    this.displayName = displayName;
    this.description = description;
  }

  identifiedBy(identifier: string): boolean {
    return this.identifier === identifier;
  }

  requiredParameters(): Map<string, InputParameter[]> {
    const r = new Map<string, InputParameter[]>();
    const kits = this.kitsAndSources();

    for (const [kitName, repr] of kits) {
      const params: InputParameter[] = [];
      params.push(...repr.requiredParameters);
      r.set(kitName, params);
    }

    return r;
  }

  // this defines the "contents" of this KitBundle in terms of which kits are contained
  abstract kitsAndSources(): Map<string, KitRepresentation>;

  // callback to be applied before we apply the kits
  abstract beforeApply(parametrization: Map<string, string>): void;

  // callback to be applied after we applied the kits
  abstract afterApply(
    platformModuleDir: string,
    kitDir: string,
    parametrization: Map<string, string>,
  ): void;

  // callback to be applied after we did the auto-deploy of kits
  abstract afterDeploy(
    platformModuleDir: string,
    parametrization: Map<string, string>,
  ): void;
}

export class KitRepresentation {
  sourceUrl: string;
  sourcePath: string | undefined;
  requiredParameters: InputParameter[];
  metadataOverride: KitMetadata | undefined;
  deployment: KitDeployRepresentation | undefined;

  constructor(
    sourceUrl: string,
    sourcePath: string | undefined,
    requiredParameters: InputParameter[],
    metadataOverride: KitMetadata | undefined,
    deployment: KitDeployRepresentation | undefined,
  ) {
    this.sourceUrl = sourceUrl;
    this.sourcePath = sourcePath;
    this.requiredParameters = requiredParameters;
    this.metadataOverride = metadataOverride;
    this.deployment = deployment;
  }
}

export const metadataKitFileName = "README.md";

export class KitMetadata {
  name: string;
  description: string;
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
}

export type BetweenDeployFunc =
  | ((platformModuleDir: string, parametrization: Map<string, string>) => void)
  | undefined;

export class KitDeployRepresentation {
  autoDeployOrder: number;
  needsDoubleDeploy: boolean;

  // callback only needed for kits that need to be deployed twice with different parameters (e.g. any bootstrap module with state migration)
  // this callback will only be executed, in case
  betweenDoubleDeployments: BetweenDeployFunc;
  deployMode: TerragruntArguments;

  constructor(
    autoDeployOrder: number,
    needsDoubleDeploy: boolean,
    betweenDoubleDeployments: BetweenDeployFunc,
    deployMode: TerragruntArguments,
  ) {
    this.autoDeployOrder = autoDeployOrder;
    this.needsDoubleDeploy = needsDoubleDeploy;
    this.betweenDoubleDeployments = betweenDoubleDeployments;
    this.deployMode = deployMode;
  }
}

// FIXME following seems not really related to a KitBundle, should be moved to some util file or so

export type InputParameter = InputPromptParameter | InputSelectParameter;

export interface InputPromptParameter {
  description: string;
  validationRegex: RegExp;
  hint: string | undefined;
  validationFailureMessage: string;
}

export interface InputSelectParameter {
  description: string;
  hint: string | undefined;
  options: SelectValueOptions;
}
