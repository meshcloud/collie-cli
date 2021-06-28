import { Confirm } from "../deps.ts";
import { ErrorCodes, MeshAzurePlatformError } from "../errors.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import {
  ConsumptionInfo,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";

/**
 * If a AzureCliFacade is wrapped with this one, the user will be asked if
 * a module of the CLI should be installed automatically.
 */
export class AutoInstallAzureCliModuleDecorator implements AzureCliFacade {
  constructor(
    private readonly azureFacade: AzureCliFacade,
  ) {}

  async getCostInfo(
    mgmtGroupId: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]> {
    return await this.azureFacade.getCostInfo(mgmtGroupId, from, to);
  }

  setDynamicInstallValue(value: DynamicInstallValue): void {
    this.azureFacade.setDynamicInstallValue(value);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    return await this.azureFacade.getDynamicInstallValue();
  }

  async listAccounts(): Promise<Subscription[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.listAccounts();
    });
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.listTags(subscription);
    });
  }

  async getCostInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.getCostInformation(
        subscription,
        startDate,
        endDate,
      );
    });
  }

  private async wrapCallWithInstallInterception<T>(
    callFn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callFn();
    } catch (e) {
      if (this.isAzureModuleMissingError(e) && this.isTTY()) {
        const confirmed: boolean = await Confirm.prompt(
          "A Azure CLI extention is missing for this call. Should the Azure extension get installed automatically?",
        );
        if (confirmed) {
          const originalValue =
            await this.azureFacade.getDynamicInstallValue() || "yes_prompt";
          this.azureFacade.setDynamicInstallValue("yes_without_prompt");
          const result = await callFn();
          this.azureFacade.setDynamicInstallValue(originalValue);

          return result;
        }
      }

      throw e;
    }
  }

  private isAzureModuleMissingError(e: Error): boolean {
    return (e instanceof MeshAzurePlatformError) &&
      (e as MeshAzurePlatformError).errorCode ===
        ErrorCodes.AZURE_CLI_MISSING_EXTENSION;
  }

  private isTTY(): boolean {
    return Deno.isatty(Deno.stdout.rid);
  }
}
