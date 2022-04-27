import {
  AzureErrorCode,
  MeshAzurePlatformError,
  MeshAzureRetryableError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { ShellRunner } from "../process/shell-runner.ts";
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
import { CLICommand } from "../config/config.model.ts";
import { parseJsonWithLog } from "../json.ts";

interface ConfigValue {
  name: string;
  source: string;
  value: DynamicInstallValue;
}

export class BasicAzureCliFacade implements AzureCliFacade {
  constructor(private readonly shellRunner: ShellRunner) {}

  private readonly errRegexExtensionMissing =
    /ERROR: The command requires the extension (\w+)/;

  private readonly errTooManyRequests = /ERROR: \(429\).*?(\d+) seconds/;
  private readonly errCertInvalid = /ERROR: \(401\) Certificate is not/;
  private readonly errInvalidSubscription =
    /\(422\) Cost Management supports only Enterprise Agreement/;
  private readonly errNotAuthorized = /\((AuthorizationFailed)\)/;

  async setDynamicInstallValue(value: DynamicInstallValue) {
    const result = await this.shellRunner.run(
      `az config set extension.use_dynamic_install=${value}`
    );
    this.checkForErrors(result);

    console.debug(`setDynamicInstallValue: ${JSON.stringify(result)}`);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    const command = "az config get extension.use_dynamic_install";
    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    console.debug(`getDynamicInstallValue: ${JSON.stringify(result)}`);

    if (result.code == 1) {
      return Promise.resolve(null);
    }

    const cv = parseJsonWithLog<ConfigValue>(result.stdout);

    return Promise.resolve(cv.value);
  }

  async listSubscriptions(): Promise<Subscription[]> {
    const command = "az account list";
    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    console.debug(`listAccounts: ${JSON.stringify(result)}`);

    return parseJsonWithLog(result.stdout);
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    const command = `az tag list --subscription ${subscription.id}`;
    const result = await this.shellRunner.run(command);

    this.checkForErrors(result);

    console.debug(`listTags: ${JSON.stringify(result)}`);

    return parseJsonWithLog(result.stdout);
  }

  async listManagementGroups(): Promise<ManagementGroup[]> {
    const command = `az account management-group list`;
    const result = await this.shellRunner.run(command);

    this.checkForErrors(result);

    return await parseJsonWithLog(result.stdout);
  }

  async getAccount(): Promise<Account> {
    const command = `az account show`;
    const result = await this.shellRunner.run(command);

    this.checkForErrors(result);

    return await parseJsonWithLog(result.stdout);
  }

  /**
   * After succesful invocation all these tags are present on the Subscription.
   * @param subscription
   * @param tags The list of tags put onto the subscription.
   */
  async putTags(subscription: Subscription, tags: AzureMeshTag[]) {
    const tagsString = tags
      .map((x) => `${x.tagName}=${x.values.join(",")}`)
      .join(" ");
    const command = `az tag create --resource-id /subscriptions/${subscription.id} --tags ${tagsString}`;

    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    console.debug(`putTags: ${JSON.stringify(result)}`);
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
    to: string
  ): Promise<SimpleCostManagementInfo[]> {
    const cmd =
      `az costmanagement query --type AmortizedCost --dataset-aggregation {"totalCost":{"name":"PreTaxCost","function":"Sum"}} ` +
      `--dataset-grouping name=SubscriptionId type=Dimension --timeframe Custom --time-period from=${from} to=${to} --scope ${scope}`;

    const result = await this.shellRunner.run(cmd);
    this.checkForErrors(result);

    console.debug(`getCostManagementInfo: ${JSON.stringify(result)}`);

    const costManagementInfo = parseJsonWithLog<CostManagementInfo>(
      result.stdout
    );
    if (costManagementInfo.nextLinks != null) {
      console.error(
        `Azure response signals that there is paging information available, but we are unable to fetch it. So the results are possibly incomplete.`
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
    subscription: Subscription
  ): Promise<RoleAssignment[]> {
    const cmd = `az role assignment list --subscription ${subscription.id} --include-inherited --all --output json`;

    const result = await this.shellRunner.run(cmd);
    this.checkForErrors(result);

    console.debug(`getRoleAssignments: ${JSON.stringify(result)}`);

    return parseJsonWithLog<RoleAssignment[]>(result.stdout);
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code == 2) {
      const errMatch = this.errRegexExtensionMissing.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const missingExtension = errMatch[1];

        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_CLI_MISSING_EXTENSION,
          `Missing the Azure cli extention: ${missingExtension}, please install it first.`
        );
      }

      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        `Error executing Azure CLI: ${result.stdout} - ${result.stderr}`
      );
    } else if (result.code == 1) {
      // Too many requests error
      let errMatch = this.errTooManyRequests.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const delayS = parseInt(errMatch[1]);

        throw new MeshAzureRetryableError(
          AzureErrorCode.AZURE_TOO_MANY_REQUESTS,
          delayS
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
          "Subscription cost could not be requested via the Cost Management API"
        );
      }

      errMatch = this.errNotAuthorized.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzurePlatformError(
          AzureErrorCode.AZURE_UNAUTHORIZED,
          "Request could not be made because the current user is not allowed to access this resource"
        );
      }

      // We encountered an error so we will just throw here.
      throw new MeshAzurePlatformError(
        AzureErrorCode.AZURE_CLI_GENERAL,
        result.stderr
      );
    }

    // Detect login error
    if (
      result.stderr.includes("az login") ||
      // There is a possibility that a faulty token returns an unknown status code but contains this as part of the error message.
      // to solve this the user must just perform a new login so we issue this error if we detect this string.
      result.stderr.includes("AADSTS700082")
    ) {
      console.log(
        `You are not logged in into Azure CLI. Please login with "az login" or disconnect with "${CLICommand} config --disconnect Azure".`
      );
      throw new MeshNotLoggedInError(`"${result.stderr.replace("\n", "")}"`);
    }
  }
}
