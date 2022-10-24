import { TerragruntArguments } from "../../../api/terragrunt/TerragruntCliFacade.ts";

export abstract class KitBundle {
  identifier: string;
  displayName: string;

  constructor(identifier: string, displayName: string) {
    this.identifier = identifier;
    this.displayName = displayName;
  }

  identifiedBy(identifier: string): boolean {
    return this.identifier === identifier;
  }

  // this defines the "contents" of this KitBundle in terms of which kits are contained
  abstract kitsAndSources(): Map<string, KitRepresentation>;

  // callback to by applied before we apply the kits
  abstract beforeApply(parametrization: Map<string,string>): void;

  // callback to by applied after we applied the kits
  abstract afterApply(platformModuleDir: string, parametrization: Map<string,string>): void;

  // callback to by applied after we did the auto-deploy of kits
  abstract afterDeploy(platformModuleDir: string, parametrization: Map<string,string>): void;
}

export class KitRepresentation {
  sourceUrl: string
  sourcePath: string | undefined
  requiredParameters: string[]
  metadataOverride: KitMetadata | undefined  
  deployment: KitDeployRepresentation | undefined

  constructor(sourceUrl: string, sourcePath: string | undefined, requiredParameters: string[], metadataOverride: KitMetadata | undefined, deployment: KitDeployRepresentation | undefined) {
    this.sourceUrl = sourceUrl;
    this.sourcePath = sourcePath;
    this.requiredParameters = requiredParameters;
    this.metadataOverride = metadataOverride;
    this.deployment = deployment;
  }
}

export const metadataKitFileName = "README.md";

export class KitMetadata {
  name: string
  description: string
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
}

export type BetweenDeployFunc = ((platformModuleDir: string, parametrization: Map<string,string>) => void) | undefined;

export class KitDeployRepresentation {
  autoDeployOrder: number
  needsDoubleDeploy: boolean

  // callback only needed for kits that need to be deployed twice with different parameters (e.g. any bootstrap module with state migration)
  // this callback will only be executed, in case
  betweenDoubleDeployments: BetweenDeployFunc
  secondDeploymentArgs: TerragruntArguments

  constructor(autoDeployOrder: number, needsDoubleDeploy: boolean, betweenDoubleDeployments: BetweenDeployFunc, secondDeploymentArgs: TerragruntArguments) {
    this.autoDeployOrder = autoDeployOrder;
    this.needsDoubleDeploy = needsDoubleDeploy;
    this.betweenDoubleDeployments = betweenDoubleDeployments;
    this.secondDeploymentArgs = secondDeploymentArgs;
  }
}