import { CliFacade } from "../CliFacade.ts";
import {
  Account,
  AzureMeshTag,
  ManagementGroup,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";

export type DynamicInstallValue = "yes_without_prompt" | "yes_prompt" | "no";

export interface AzureCliFacade extends CliFacade {
  setDynamicInstallValue(value: DynamicInstallValue): void;
  getDynamicInstallValue(): Promise<DynamicInstallValue | null>;

  getAccount(): Promise<Account>;

  listManagementGroups(): Promise<ManagementGroup[]>;

  listSubscriptions(): Promise<Subscription[]>;

  listTags(subscription: Subscription): Promise<Tag[]>;
  putTags(subscription: Subscription, tags: AzureMeshTag[]): Promise<void>;

  getCostManagementInfo(
    scope: string,
    from: string,
    to: string
  ): Promise<SimpleCostManagementInfo[]>;

  getRoleAssignments(subscription: Subscription): Promise<RoleAssignment[]>;
}
