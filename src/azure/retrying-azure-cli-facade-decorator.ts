import { MeshAzureRetryableError } from "../errors.ts";
import { sleep } from "../promises.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import {
  Account,
  AzureMeshTag,
  ConsumptionInfo,
  ManagementGroup,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";

/**
 * Retries a call into Azure in case there Azure CLI threw an error which indicated
 * a too many request problem. There are also other typical Azure related problems
 * like the 401 error which tells us about a certificat error.
 */
export class RetryingAzureCliFacadeDecorator implements AzureCliFacade {
  constructor(private readonly wrapped: AzureCliFacade) {}

  async getCostManagementInfo(
    mgmtGroupId: string,
    from: string,
    to: string
  ): Promise<SimpleCostManagementInfo[]> {
    return await this.retryable(async () => {
      return await this.wrapped.getCostManagementInfo(mgmtGroupId, from, to);
    });
  }

  setDynamicInstallValue(value: DynamicInstallValue): void {
    this.wrapped.setDynamicInstallValue(value);
  }

  getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    return this.wrapped.getDynamicInstallValue();
  }

  async listSubscriptions(): Promise<Subscription[]> {
    return await this.retryable(async () => {
      return await this.wrapped.listSubscriptions();
    });
  }

  async listManagementGroups(): Promise<ManagementGroup[]> {
    return await this.retryable(async () => {
      return await this.wrapped.listManagementGroups();
    });
  }

  async getAccount(): Promise<Account> {
    return await this.retryable(async () => {
      return await this.wrapped.getAccount();
    });
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    return await this.retryable(async () => {
      return await this.wrapped.listTags(subscription);
    });
  }

  putTags(subscription: Subscription, tags: AzureMeshTag[]): Promise<void> {
    return this.wrapped.putTags(subscription, tags);
  }

  async getConsumptionInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date
  ): Promise<ConsumptionInfo[]> {
    return await this.retryable(async () => {
      return await this.wrapped.getConsumptionInformation(
        subscription,
        startDate,
        endDate
      );
    });
  }

  async getRoleAssignments(
    subscription: Subscription
  ): Promise<RoleAssignment[]> {
    return await this.retryable(async () => {
      return await this.wrapped.getRoleAssignments(subscription);
    });
  }

  private async retryable<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof MeshAzureRetryableError) {
        if (e.errorCode === "AZURE_TOO_MANY_REQUESTS") {
          console.log(
            `Azure complains about too many requests. Need to wait ${e.retryInSeconds}s`
          );
        }

        console.debug("Cought retryable error");
        await sleep(e.retryInSeconds * 1000 + 500);

        return await fn();
      }

      throw e;
    }
  }
}
