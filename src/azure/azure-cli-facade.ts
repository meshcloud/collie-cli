import { ConsumptionInfo, Subscription, Tag } from "./azure.model.ts";

export type DynamicInstallValue = "yes_without_prompt" | "yes_prompt" | "no";

export interface AzureCliFacade {
  setDynamicInstallValue(value: DynamicInstallValue): void;
  getDynamicInstallValue(): Promise<DynamicInstallValue | null>;
  listAccounts(): Promise<Subscription[]>;
  listTags(subscription: Subscription): Promise<Tag[]>;
  getCostInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]>;
}
