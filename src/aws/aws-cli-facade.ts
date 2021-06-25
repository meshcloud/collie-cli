import { ShellRunner } from "../process/shell-runner.ts";
import {
  Account,
  AccountResponse,
  CostResponse,
  Tag,
  TagResponse,
} from "./aws.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { log, moment } from "../deps.ts";
import {
  ErrorCodes,
  MeshAwsPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { sleep } from "../promises.ts";
import { CLICommand } from "../config/config.model.ts";

export class AwsCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  async listAccounts(): Promise<Account[]> {
    let nextToken = null;
    let accounts: Account[] = [];
    do {
      let command = "aws organizations list-accounts --output json";
      if (nextToken != null) {
        command += ` --starting-token ${nextToken}`;
      }
      const result = await this.shellRunner.run(command);
      this.checkForErrors(result);

      log.debug(`listAccounts: ${JSON.stringify(result)}`);

      const jsonResult = JSON.parse(result.stdout) as AccountResponse;
      nextToken = jsonResult.NextToken;
      accounts = accounts.concat(jsonResult.Accounts);
    } while (nextToken != null);

    return accounts;
  }

  async listTags(account: Account): Promise<Tag[]> {
    const result = await this.shellRunner.run(
      `aws organizations list-tags-for-resource --resource-id ${account.Id}`,
    );
    this.checkForErrors(result);

    log.debug(`listTags: ${JSON.stringify(result)}`);

    if (result.code === 254) {
      log.debug("AWS is overheated. We wait one second and continue.");
      await sleep(1000);

      return await this.listTags(account);
    }

    return (JSON.parse(result.stdout) as TagResponse).Tags;
  }

  /**
   * https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
   *
   * Note: the actual paging handling has not been tested but has been built by using [listAccounts]' logic and AWS docs.
   */
  async listCosts(startDate: Date, endDate: Date): Promise<CostResponse> {
    let result: CostResponse | null = null;
    let nextToken = null;
    const format = "YYYY-MM-DD";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);

    do {
      let command =
        `aws ce get-cost-and-usage --time-period Start=${start},End=${end} --granularity MONTHLY --metrics BLENDED_COST --group-by Type=DIMENSION,Key=LINKED_ACCOUNT`;
      if (nextToken != null) {
        command += ` --next-page-token=${nextToken}`;
      }
      const rawResult = await this.shellRunner.run(command);
      this.checkForErrors(rawResult);

      log.debug(`listCosts: ${JSON.stringify(rawResult)}`);

      const costResult = JSON.parse(rawResult.stdout) as CostResponse;

      if (costResult.NextPageToken) {
        nextToken = costResult.NextPageToken;
      }
      // This is a bit hacky but we extend the original response with new data, rather than overwriting it.
      if (!result) {
        result = costResult;
      } else {
        result.ResultsByTime = result.ResultsByTime.concat(
          costResult.ResultsByTime,
        );
        // We do not concat the other values since (we assume) they do not change in-between requests.
      }
    } while (nextToken != null);

    return result;
  }

  private checkForErrors(result: ShellOutput) {
    if (result.code === 2) {
      throw new MeshAwsPlatformError(
        ErrorCodes.AWS_CLI_GENERAL,
        result.stderr,
      );
    } else if (result.code === 254) {
      log.info(
        `The provided credentials in "aws config" are not valid. Please check it or disconnect from AWS with "${CLICommand} config --disconnect AWS"`,
      );
      throw new MeshNotLoggedInError(
        ErrorCodes.NOT_LOGGED_IN,
        result.stderr,
      );
    }
  }
}
