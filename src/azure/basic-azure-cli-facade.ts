import {
  AzureErrorCode,
  MeshAzurePlatformError,
  MeshAzureRetryableError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { ShellRunner } from "../process/shell-runner.ts";
import { log, moment } from "../deps.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import {
  ConsumptionInfo,
  CostManagementInfo,
  RoleAssignment,
  SimpleCostManagementInfo,
  Subscription,
  Tag,
} from "./azure.model.ts";
import { CLICommand } from "../config/config.model.ts";
import { parseJsonStdoutWithLog } from "../json.ts";

interface ConfigValue {
  name: string;
  source: string;
  value: DynamicInstallValue;
}

export class BasicAzureCliFacade implements AzureCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  private readonly errRegexExtensionMissing =
    /ERROR: The command requires the extension (\w+)/;

  private readonly errTooManyRequests = /ERROR: \(429\).*?(\d+) seconds/;
  private readonly errCertInvalid = /ERROR: \(401\) Certificate is not/;
  private readonly errInvalidSubscription =
    /\(422\) Cost Management supports only Enterprise Agreement/;
  private readonly errNotAuthorized = /\((AuthorizationFailed)\)/;

  async setDynamicInstallValue(value: DynamicInstallValue) {
    const result = await this.shellRunner.run(
      `az config set extension.use_dynamic_install=${value}`,
    );
    this.checkForErrors(result);

    log.debug(`setDynamicInstallValue: ${JSON.stringify(result)}`);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    const command = "az config get extension.use_dynamic_install";
    const result = await this.shellRunner.run(
      command,
    );
    this.checkForErrors(result);

    log.debug(`getDynamicInstallValue: ${JSON.stringify(result)}`);

    if (result.code == 1) {
      return Promise.resolve(null);
    }

    const cv = parseJsonStdoutWithLog<ConfigValue>(result, command);

    return Promise.resolve(cv.value);
  }

  async listAccounts(): Promise<Subscription[]> {
    const command = "az account list";
    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    log.debug(`listAccounts: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog(result, command);
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    const command = `az tag list --subscription ${subscription.id}`;
    const result = await this.shellRunner.run(
      command,
    );

    // we need to catch the case where certain subscriptions might not be accessible for the user.
    // we will just ignore this in that case and continue.
    try {
      this.checkForErrors(result);
    } catch (e) {
      if (
        e instanceof MeshAzurePlatformError &&
        e.errorCode == AzureErrorCode.AZURE_UNAUTHORIZED
      ) {
        log.warning(
          `Could not list tags for Subscription ${subscription.id}: Access was denied`,
        );

        return Promise.resolve([]);
      }
    }

    log.debug(`listTags: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog(result, command);
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
    mgmtGroupId: string,
    from: string,
    to: string,
  ): Promise<SimpleCostManagementInfo[]> {
    const cmd =
      `az costmanagement query --type AmortizedCost --dataset-aggregation {"totalCost":{"name":"PreTaxCost","function":"Sum"}} ` +
      `--dataset-grouping name=SubscriptionId type=Dimension --timeframe Custom --time-period from=${from} to=${to} --scope providers/Microsoft.Management/managementGroups/${mgmtGroupId}`;

    const result = await this.shellRunner.run(cmd);
    this.checkForErrors(result);

    log.debug(`getCostManagementInfo: ${JSON.stringify(result)}`);

    const costManagementInfo = parseJsonStdoutWithLog<CostManagementInfo>(
      result,
      cmd,
    );
    if (costManagementInfo.nextLinks != null) {
      log.warning(
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

  /**
   * Uses the consumptions API on a per Subscription level. This is quite costly to query for every Subscription.
   */
  async getConsumptionInformation(
    subscription: Subscription,
    startDate: Date,
    endDate: Date,
  ): Promise<ConsumptionInfo[]> {
    const startDateStr = moment(startDate).format("YYYY-MM-DD");
    const endDateStr = moment(endDate).format("YYYY-MM-DD");
    const cmd =
      `az consumption usage list --subscription ${subscription.id} --start-date ${startDateStr} --end-date ${endDateStr}`;

    const result = await this.shellRunner.run(cmd);
    this.checkForErrors(result);

    log.debug(`getConsumptionInformation: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog(result, cmd);
  }

  async getRoleAssignments(
    subscription: Subscription,
  ): Promise<RoleAssignment[]> {
    const cmd =
      `az role assignment list --subscription ${subscription.name} --include-inherited --all --output json`;

    const result = await this.shellRunner.run(cmd);
    this.checkForErrors(result);

    log.debug(`getRoleAssignments: ${JSON.stringify(result)}`);

    return parseJsonStdoutWithLog<RoleAssignment[]>(result, cmd);
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code == 2) {
      const errMatch = this.errRegexExtensionMissing.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const missingExtension = errMatch[1];

        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_CLI_MISSING_EXTENSION,
          `Missing the Azure cli extention: ${missingExtension}, please install it first.`,
        );
      }

      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        `Error executing Azure CLI: ${result.stdout} - ${result.stderr}`,
      );
    } else if (result.code == 1) {
      // Too many requests error
      let errMatch = this.errTooManyRequests.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const delayS = parseInt(errMatch[1]);

        throw new MeshAzureRetryableError(
          AzureErrorCode.AZURE_TOO_MANY_REQUESTS,
          delayS,
        );
      }

      // Strange cert invalid error
      errMatch = this.errCertInvalid.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzureRetryableError(AzureErrorCode.AZURE_CLI_GENERAL, 60);
      }

      errMatch = this.errInvalidSubscription.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_INVALID_SUBSCRIPTION,
          "Subscription cost could not be requested via the Cost Management API",
        );
      }

      errMatch = this.errNotAuthorized.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_UNAUTHORIZED,
          "Request could not be made because the current user is not allowed to access this resource",
        );
      }

      // We encountered an error so we will just throw here.
      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        result.stderr,
      );
    }

    // Detect login error
    if (result.stderr.includes("az login")) {
      log.info(
        `You are not logged in into Azure CLI. Please disconnect from azure with "${CLICommand} config --disconnect Azure" or login into Azure CLI.`,
      );
      throw new MeshNotLoggedInError(`"${result.stderr.replace("\n", "")}"`);
    }
  }
}
