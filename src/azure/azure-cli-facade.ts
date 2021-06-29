import {
  ConsumptionInfo,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";

export type DynamicInstallValue = "yes_without_prompt" | "yes_prompt" | "no";

export interface AzureCliFacade {
  setDynamicInstallValue(value: DynamicInstallValue): void;
  getDynamicInstallValue(): Promise<DynamicInstallValue | null>;
  listAccounts(): Promise<Subscription[]>;
  listTags(subscription: Subscription): Promise<Tag[]>;
  getCostManagementInfo(
    mgmtGroupId: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]>;
  getConsumptionInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]>;
  getRoleAssignments(subscription: Subscription): Promise<RoleAssignment[]>;
}
