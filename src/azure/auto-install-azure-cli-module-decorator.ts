import { Confirm } from "../deps.ts";
import { AzureErrorCode, MeshAzurePlatformError } from "../errors.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import {
  ConsumptionInfo,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
  TagWrite,
} from "./azure.model.ts";

/**
 * If a AzureCliFacade is wrapped with this one, the user will be asked if
 * a module of the CLI should be installed automatically.
 */
export class AutoInstallAzureCliModuleDecorator implements AzureCliFacade {
  constructor(
    private readonly azureFacade: AzureCliFacade,
  ) {}

  async getCostManagementInfo(
    mgmtGroupId: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]> {
    return await this.azureFacade.getCostManagementInfo(mgmtGroupId, from, to);
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

  putTags(subscription: Subscription, tags: TagWrite[]): Promise<void> {
    return this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.putTags(subscription, tags);
    });
  }

  async getConsumptionInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.getConsumptionInformation(
        subscription,
        startDate,
        endDate,
      );
    });
  }

  async getRoleAssignments(
    subscription: Subscription,
  ): Promise<RoleAssignment[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.getRoleAssignments(subscription);
    });
  }

  private async wrapCallWithInstallInterception<T>(
    callFn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callFn();
    } catch (e) {
      if (this.isAzureModuleMissingError(e)) {
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
    return e instanceof MeshAzurePlatformError &&
      e.errorCode === AzureErrorCode.AZURE_CLI_MISSING_EXTENSION;
  }
}
