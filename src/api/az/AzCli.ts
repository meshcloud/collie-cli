import { AzCliFacade, DynamicInstallValue } from "./AzCliFacade.ts";
import {
  Account,
  AzureMeshTag,
  CostManagementInfo,
  ManagementGroup,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./Model.ts";
import { parseJsonWithLog } from "/json.ts";

import { IProcessRunner } from "/process/IProcessRunner.ts";
import { ProcessResultWithOutput } from "/process/ProcessRunnerResult.ts";
import { ResultHandlerProcessRunnerDecorator } from "../../process/ResultHandlerProcessRunnerDecorator.ts";
import { AzCliResultHandler } from "./AzCliResultHandler.ts";
import { CliDetector } from "../CliDetector.ts";
import { CliInstallationStatus } from "../CliFacade.ts";
import { AzureErrorCode, MeshAzurePlatformError } from "../../errors.ts";

interface ConfigValue {
  name: string;
  source: string;
  value: DynamicInstallValue;
}

export class AzCli implements AzCliFacade {
  private readonly processRunner: IProcessRunner<ProcessResultWithOutput>;
  private readonly detector: CliDetector;

  constructor(rawRunner: IProcessRunner<ProcessResultWithOutput>) {
    this.detector = new CliDetector(rawRunner);

    // todo: consider wrapping the shellrunner further, e.g. to always add --output=json so we become more independent
    // of the user's global aws cli config
    this.processRunner = new ResultHandlerProcessRunnerDecorator(
      rawRunner,
      new AzCliResultHandler(this.detector),
    );
  }

  verifyCliInstalled(): Promise<CliInstallationStatus> {
    return this.detector.verifyCliInstalled("az", /azure-cli\s+2\./);
  }

  async setDynamicInstallValue(value: DynamicInstallValue) {
    await this.processRunner.run([
      "az",
      "config",
      "set",
      `extension.use_dynamic_install=${value}`,
    ]);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    try {
      const result = await this.processRunner.run([
        "az",
        "config",
        "get",
        `extension.use_dynamic_install`,
      ]);
      const cv = parseJsonWithLog<ConfigValue>(result.stdout);

      return cv.value;
    } catch (error: unknown) {
      if (
        error instanceof MeshAzurePlatformError &&
        error.errorCode === AzureErrorCode.AZURE_CLI_CONFIG_NOT_SET
      ) {
        return null;
      }

      throw error;
    }
  }

  async listSubscriptions(): Promise<Subscription[]> {
    const result = await this.processRunner.run(["az", "account", "list"]);

    return parseJsonWithLog(result.stdout);
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    const result = await this.processRunner.run([
      "az",
      "tag",
      "list",
      "--subscription",
      subscription.id,
    ]);

    return parseJsonWithLog(result.stdout);
  }

  async listManagementGroups(): Promise<ManagementGroup[]> {
    const result = await this.processRunner.run([
      "az",
      "account",
      "management-group",
      "list",
    ]);

    return await parseJsonWithLog(result.stdout);
  }

  async getAccount(): Promise<Account> {
    const result = await this.processRunner.run(["az", "account", "show"]);

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

    await this.processRunner.run(command);
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

    const result = await this.processRunner.run(cmd);

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

    const result = await this.processRunner.run(cmd);

    return parseJsonWithLog<RoleAssignment[]>(result.stdout);
  }
}
