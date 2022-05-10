import { Confirm } from "/deps.ts";
import { AzureErrorCode, MeshAzurePlatformError } from "/errors.ts";
import { AzCliFacade, DynamicInstallValue } from "./AzCliFacade.ts";
import {
  Account,
  AzureMeshTag,
  ManagementGroup,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./Model.ts";

/**
 * If a AzureCliFacade is wrapped with this one, the user will be asked if
 * a module of the CLI should be installed automatically.
 */
export class AutoInstallAzModuleAzCliDecorator implements AzCliFacade {
  constructor(private readonly azureFacade: AzCliFacade) {}

  async getCostManagementInfo(
    scope: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]> {
    return await this.azureFacade.getCostManagementInfo(scope, from, to);
  }

  setDynamicInstallValue(value: DynamicInstallValue): void {
    this.azureFacade.setDynamicInstallValue(value);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    return await this.azureFacade.getDynamicInstallValue();
  }

  async listSubscriptions(): Promise<Subscription[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.listSubscriptions();
    });
  }

  async listManagementGroups(): Promise<ManagementGroup[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.listManagementGroups();
    });
  }

  async getAccount(): Promise<Account> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.getAccount();
    });
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    return await this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.listTags(subscription);
    });
  }

  putTags(subscription: Subscription, tags: AzureMeshTag[]): Promise<void> {
    return this.wrapCallWithInstallInterception(() => {
      return this.azureFacade.putTags(subscription, tags);
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
            (await this.azureFacade.getDynamicInstallValue()) || "yes_prompt";
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
    return (
      e instanceof MeshAzurePlatformError &&
      e.errorCode === AzureErrorCode.AZURE_CLI_MISSING_EXTENSION
    );
  }
}
