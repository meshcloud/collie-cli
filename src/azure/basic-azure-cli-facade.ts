import {
  ErrorCodes,
  MeshAzurePlatformError,
  MeshAzureRetryableError,
  MeshAzureTooManyRequestsError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { ShellRunner } from "../process/shell-runner.ts";
import { log, moment } from "../deps.ts";
import { AzureCliFacade, DynamicInstallValue } from "./azure-cli-facade.ts";
import { ConsumptionInfo, Subscription, Tag } from "./azure.model.ts";
import { CLICommand } from "../config/config.model.ts";

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

  async setDynamicInstallValue(value: DynamicInstallValue) {
    const result = await this.shellRunner.run(
      `az config set extension.use_dynamic_install=${value}`,
    );
    this.checkForErrors(result);

    log.debug(`setDynamicInstallValue: ${JSON.stringify(result)}`);
  }

  async getDynamicInstallValue(): Promise<DynamicInstallValue | null> {
    const result = await this.shellRunner.run(
      "az config get extension.use_dynamic_install",
    );
    this.checkForErrors(result);

    log.debug(`getDynamicInstallValue: ${JSON.stringify(result)}`);

    if (result.code == 1) {
      return Promise.resolve(null);
    }

    const cv = JSON.parse(result.stdout) as ConfigValue;

    return Promise.resolve(cv.value);
  }

  async listAccounts(): Promise<Subscription[]> {
    const result = await this.shellRunner.run("az account list");
    this.checkForErrors(result);

    return JSON.parse(result.stdout) as Subscription[];
  }

  async listTags(subscription: Subscription): Promise<Tag[]> {
    const result = await this.shellRunner.run(
      `az tag list --subscription ${subscription.id}`,
    );
    this.checkForErrors(result);

    return JSON.parse(result.stdout) as Tag[];
  }

  async getCostInformation(
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

    log.debug(`getCostInformation: ${JSON.stringify(result)}`);

    return JSON.parse(result.stdout) as ConsumptionInfo[];
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code == 2) {
      const errMatch = this.errRegexExtensionMissing.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const missingExtension = errMatch[1];

        throw new MeshAzurePlatformError(
          ErrorCodes.AZURE_CLI_MISSING_EXTENSION,
          `Missing the Azure cli extention: ${missingExtension}, please install it first.`,
        );
      }

      throw new MeshAzurePlatformError(
        ErrorCodes.AZURE_CLI_GENERAL,
        `Error executing Azure CLI: ${result.stdout}`,
      );
    } else if (result.code == 1) {
      let errMatch = this.errTooManyRequests.exec(result.stderr);
      if (!!errMatch && errMatch.length > 0) {
        const delayS = parseInt(errMatch[1]);

        throw new MeshAzureTooManyRequestsError(delayS);
      }

      errMatch = this.errCertInvalid.exec(result.stderr);
      if (errMatch) {
        throw new MeshAzureRetryableError(60);
      }
    }
    if (result.stderr.includes("az login")) {
      log.info(
        `You are not logged in into Azure CLI. Please disconnect from azure with "${CLICommand} config --disconnect Azure" or login into Azure CLI.`,
      );
      throw new MeshNotLoggedInError(
        ErrorCodes.NOT_LOGGED_IN,
        `"${result.stderr.replace("\n", "")}"`,
      );
    }
  }
}
