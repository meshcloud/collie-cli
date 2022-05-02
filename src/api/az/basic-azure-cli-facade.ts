import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import {
  Account,
  AzureMeshTag,
  CostManagementInfo,
  ManagementGroup,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";
import { parseJsonWithLog } from "/json.ts";
import { CliInstallationStatus } from "../CliFacade.ts";
import { PlatformCommandInstallationStatus } from "../../cli-detector.ts";

import { IShellRunner } from "/process/IShellRunner.ts";
import { ProcessResultWithOutput } from "/process/ShellRunnerResult.ts";
import { ShellRunnerResultHandlerDecorator } from "../../process/ShellRunnerResultHandlerDecorator.ts";
import { AzureCliResultHandler } from "./AzureCliResultHandler.ts";

interface ConfigValue {
  name: string;
  source: string;
  value: DynamicInstallValue;
}

export class BasicAzureCliFacade implements AzureCliFacade {
  private readonly shellRunner: IShellRunner<ProcessResultWithOutput>;

  constructor(
    private readonly rawRunner: IShellRunner<ProcessResultWithOutput>,
  ) {
    // todo: consider wrapping the shellrunner further, e.g. to always add --output=json so we become more independent
    // of the user's global azure cli config
    this.shellRunner = new ShellRunnerResultHandlerDecorator(
      this.rawRunner,
      new AzureCliResultHandler(),
    );
  }

  // todo: maybe factor detection logic into its own class, not part of the facade?
  async verifyCliInstalled(): Promise<CliInstallationStatus> {
    try {
      const result = await this.rawRunner.run(["az", "--version"]);

      return {
        cli: "az",
        status: this.determineInstallationStatus(result),
      };
    } catch {
      return {
        cli: "az",
        status: PlatformCommandInstallationStatus.NotInstalled,
      };
    }
  }

  private determineInstallationStatus(result: ProcessResultWithOutput) {
    if (result.status.code !== 0) {
      return PlatformCommandInstallationStatus.NotInstalled;
    }

    const regex = /azure-cli\s+2\./;

    return regex.test(result.stdout)
      ? PlatformCommandInstallationStatus.Installed
      : PlatformCommandInstallationStatus.UnsupportedVersion;
  }

  async setDynamicInstallValue(value: DynamicInstallValue) {
    await this.shellRunner.run([
      "az",
      "config",
      "set",
      `extension.use_dynamic_install=${value}`,
    ]);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    const result = await this.shellRunner.run([
      "az",
      "config",
      "get",
      `extension.use_dynamic_install`,
    ]);

    if (result.status.code == 1) {
      return null;
    }

    const cv = parseJsonWithLog<ConfigValue>(result.stdout);

    return cv.value;
  }

  async listSubscriptions(): Promise<Subscription[]> {
    const result = await this.shellRunner.run(["az", "account", "list"]);

    return parseJsonWithLog(result.stdout);
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    const result = await this.shellRunner.run([
      "az",
      "tag",
      "list",
      "--subscription",
      subscription.id,
    ]);

    return parseJsonWithLog(result.stdout);
  }

  async listManagementGroups(): Promise<ManagementGroup[]> {
    const result = await this.shellRunner.run([
      "az",
      "account",
      "management-group",
      "list",
    ]);

    return await parseJsonWithLog(result.stdout);
  }

  async getAccount(): Promise<Account> {
    const result = await this.shellRunner.run(["az", "account", "show"]);

    return await parseJsonWithLog(result.stdout);
  }

  /**
   * After succesful invocation all these tags are present on the Subscription.
   * @param subscription
   * @param tags The list of tags put onto the subscription.
   */
  async putTags(subscription: Subscription, tags: AzureMeshTag[]) {
    const command = [
      "az",
      "tag",
      "create",
      "--resource-id",
      `/subscriptions/${subscription.id}`,
      "--tags",
      ...tags.map((x) => `${x.tagName}=${x.values.join(",")}`),
    ];

    await this.shellRunner.run(command);
  }

  /**
   * Uses cost management info.
   *
   * @param mgmtGroupId
   * @param from Should be a date string like 2021-01-01T00:00:00
   * @param to Should be a date string like 2021-01-01T00:00:00
   * @returns
   */
  async getCostManagementInfo(
    scope: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]> {
    const cmd = [
      "az",
      "costmanagement",
      "query",
      "--type",
      "AmortizedCost",
      "--dataset-aggregation",
      '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}',
      "--dataset-grouping",
      "name=SubscriptionId",
      "type=Dimension",
      "--timeframe",
      "Custom",
      "--time-period",
      `from=${from}`,
      `to=${to}`,
      "--scope",
      scope,
    ];

    const result = await this.shellRunner.run(cmd);

    const costManagementInfo = parseJsonWithLog<CostManagementInfo>(
      result.stdout,
    );
    if (costManagementInfo.nextLinks != null) {
      console.error(
        `Azure response signals that there is paging information available, but we are unable to fetch it. So the results are possibly incomplete.`,
      );
    }

    return costManagementInfo.rows.map((r) => {
      return {
        amount: r[0],
        date: r[1],
        subscriptionId: r[2],
        currency: r[3],
      };
    });
  }

  async getRoleAssignments(
    subscription: Subscription,
  ): Promise<RoleAssignment[]> {
    const cmd = [
      "az",
      "role",
      "assignment",
      "list",
      "--subscription",
      subscription.id,
      "--include-inherited",
      "--all",
      "--output",
      "json",
    ];

    const result = await this.shellRunner.run(cmd);

    return parseJsonWithLog<RoleAssignment[]>(result.stdout);
  }
}
