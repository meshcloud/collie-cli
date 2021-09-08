import { ShellRunner } from "../process/shell-runner.ts";
import {
  Account,
  AccountResponse,
  AssumedRoleResponse,
  CostResponse,
  Credentials,
  Group,
  GroupResponse,
  Policy,
  PolicyResponse,
  Tag,
  TagResponse,
  User,
  UserResponse,
} from "./aws.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { moment } from "../deps.ts";
import {
  AwsErrorCode,
  MeshAwsPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { sleep } from "../promises.ts";
import { CLICommand, CLIName } from "../config/config.model.ts";
import { parseJsonWithLog } from "../json.ts";

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

      console.debug(`listAccounts: ${JSON.stringify(result)}`);

      const jsonResult = parseJsonWithLog<AccountResponse>(result.stdout);
      nextToken = jsonResult.NextToken;
      accounts = accounts.concat(jsonResult.Accounts);
    } while (nextToken != null);

    return accounts;
  }

  async listTags(account: Account): Promise<Tag[]> {
    const command =
      `aws organizations list-tags-for-resource --resource-id ${account.Id}`;

    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    console.debug(`listTags: ${JSON.stringify(result)}`);

    if (result.code === 254) {
      console.debug("AWS is overheated. We wait one second and continue.");
      await sleep(1000);

      return await this.listTags(account);
    }

    return parseJsonWithLog<TagResponse>(result.stdout).Tags;
  }

  async assumeRole(
    roleArn: string,
    credentials?: Credentials,
  ): Promise<Credentials> {
    const command =
      `aws sts assume-role --role-arn ${roleArn} --role-session-name Collie-Session`;

    const result = await this.shellRunner.run(command, credentials);
    this.checkForErrors(result);

    console.debug(`assumeRole: ${JSON.stringify(result)}`);

    return parseJsonWithLog<AssumedRoleResponse>(result.stdout).Credentials;
  }

  async listUsers(credential: Credentials): Promise<User[]> {
    const command = `aws iam list-users --max-items 50`;

    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    console.debug(`listUsers: ${JSON.stringify(result)}`);

    let response = parseJsonWithLog<UserResponse>(result.stdout);
    const users = response.Users;

    while (response.NextToken) {
      const pagedCommand = `${command} --starting-token ${response.NextToken}`;
      const result = await this.shellRunner.run(pagedCommand);
      this.checkForErrors(result);

      response = parseJsonWithLog<UserResponse>(result.stdout);

      users.push(...response.Users);
    }

    return users;
  }

  async listGroups(credential: Credentials): Promise<Group[]> {
    const command = `aws iam list-groups --max-items 50`;

    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    console.debug(`listGroups: ${JSON.stringify(result)}`);

    let response = parseJsonWithLog<GroupResponse>(result.stdout);
    const groups = response.Groups;

    while (response.NextToken) {
      const pagedCommand = `${command} --starting-token ${response.NextToken}`;
      const result = await this.shellRunner.run(pagedCommand);
      this.checkForErrors(result);

      response = parseJsonWithLog<GroupResponse>(result.stdout);

      groups.push(...response.Groups);
    }

    return groups;
  }

  async listUserOfGroup(
    group: Group,
    credential: Credentials,
  ): Promise<User[]> {
    const command =
      `aws iam get-group --group-name ${group.GroupName} --max-items 50`;

    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    console.debug(`listUserOfGroup: ${JSON.stringify(result)}`);

    let response = parseJsonWithLog<UserResponse>(result.stdout);
    const userOfGroup = response.Users;

    while (response.NextToken) {
      const pagedCommand = `${command} --starting-token ${response.NextToken}`;
      const result = await this.shellRunner.run(pagedCommand);
      this.checkForErrors(result);

      response = parseJsonWithLog<UserResponse>(result.stdout);

      userOfGroup.push(...response.Users);
    }

    return userOfGroup;
  }

  async listAttachedGroupPolicies(
    group: Group,
    credential: Credentials,
  ): Promise<Policy[]> {
    const command =
      `aws iam list-attached-group-policies --group-name ${group.GroupName}`;

    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    console.debug(`listAttachedGroupPolicies: ${JSON.stringify(result)}`);

    let response = parseJsonWithLog<PolicyResponse>(result.stdout);
    const policies = response.AttachedPolicies;

    while (response.Marker) {
      const pagedCommand = `${command} --starting-token ${response.Marker}`;
      const result = await this.shellRunner.run(pagedCommand);
      this.checkForErrors(result);

      response = parseJsonWithLog<PolicyResponse>(result.stdout);

      policies.push(...response.AttachedPolicies);
    }

    return policies;
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

      console.debug(`listCosts: ${JSON.stringify(rawResult)}`);

      const costResult = parseJsonWithLog<CostResponse>(rawResult.stdout);

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
    switch (result.code) {
      case 0:
        return;
      case 253:
        throw new MeshNotLoggedInError(
          `You are not correctly logged into AWS CLI. Please verify credentials with "aws config" or disconnect with "${CLICommand} config --disconnect AWS"\n${result.stderr}`,
        );
      case 254:
        throw new MeshAwsPlatformError(
          AwsErrorCode.AWS_UNAUTHORIZED,
          `Access to required AWS API calls is not permitted. You must use ${CLIName} from a AWS management account user.\n${result.stderr}`,
        );
      default:
        throw new MeshAwsPlatformError(
          AwsErrorCode.AWS_CLI_GENERAL,
          result.stderr,
        );
    }
  }
}
