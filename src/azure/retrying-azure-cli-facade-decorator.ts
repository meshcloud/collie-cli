import { log } from "../deps.ts";
import {
  MeshAzureRetryableError,
  MeshAzureTooManyRequestsError,
} from "../errors.ts";
import { sleep } from "../promises.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import { ConsumptionInfo, Subscription, Tag } from "./azure.model.ts";

/**
 * Retries a call into Azure in case there Azure CLI threw an error which indicated
 * a too many request problem. There are also other typical Azure related problems
 * like the 401 error which tells us about a certificat error.
 */
export class RetryingAzureCliFacadeDecorator implements AzureCliFacade {
  constructor(
    private readonly wrapped: AzureCliFacade,
  ) {}

  setDynamicInstallValue(value: DynamicInstallValue): void {
    this.wrapped.setDynamicInstallValue(value);
  }

  getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    return this.wrapped.getDynamicInstallValue();
  }

  async listAccounts(): Promise<Subscription[]> {
    return await this.retryable(async () => {
      return await this.wrapped.listAccounts();
    });
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    return await this.retryable(async () => {
      return await this.wrapped.listTags(subscription);
    });
  }

  async getCostInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]> {
    return await this.retryable(async () => {
      return await this.wrapped.getCostInformation(
        subscription,
        startDate,
        endDate,
      );
    });
  }

  private async retryable<T>(fn: () => Promise<T>) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof MeshAzureTooManyRequestsError) {
        log.debug("Cought retryable error");
        console.log(
          `Azure has had too many requests. Need to wait ${e.retryInSeconds}s`,
        );
        // Retry once more after we waited out the delay + safety
        await sleep(e.retryInSeconds * 1000 + 500);

        return await fn();
      }

      if (e instanceof MeshAzureRetryableError) {
        log.debug("Cought retryable error");
        await sleep(e.retryInSeconds * 1000 + 500);

        return await fn();
      }

      throw e;
    }
  }
}
