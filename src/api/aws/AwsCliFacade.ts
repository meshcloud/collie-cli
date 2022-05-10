import {
  Account,
  AccountResponse,
  AssumedRoleResponse,
  CallerIdentity,
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
} from "/api/aws/Model.ts";
import { moment } from "/deps.ts";
import { sleep } from "/promises.ts";
import { parseJsonWithLog } from "/json.ts";

import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
import { ResultHandlerProcessRunnerDecorator } from "../../process/ResultHandlerProcessRunnerDecorator.ts";
import { IProcessRunner } from "../../process/IProcessRunner.ts";
import { AwsCliResultHandler } from "./AwsCliResultHandler.ts";
import { CliDetector } from "../CliDetector.ts";

export class AwsCliFacade {
  private readonly processRunner: IProcessRunner<ProcessResultWithOutput>;

  constructor(rawRunner: IProcessRunner<ProcessResultWithOutput>) {
    const detector = new CliDetector(rawRunner);

    // todo: consider wrapping the runner further, e.g. to always add --output=json so we become more independent
    // of the user's global aws cli config
    this.processRunner = new ResultHandlerProcessRunnerDecorator(
      rawRunner,
      new AwsCliResultHandler(detector),
    );
  }

  async listProfiles(): Promise<string[]> {
    const result = await this.processRunner.run([
      "aws",
      "configure",
      "list-profiles",
    ]);

    // this output is not json
    return result.stdout.trim().split("\n");
  }

  async listAccounts(): Promise<Account[]> {
    const command = [
      "aws",
      "organizations",
      "list-accounts",
      "--output",
      "json",
    ];

    const pages = await this.runPaged<AccountResponse>(
      command,
      (x) => x.NextToken,
      (x) => ["--starting-token", x],
    );

    return pages.flatMap((x) => x.Accounts);
  }

  async listTags(account: Account): Promise<Tag[]> {
    const command = [
      "aws",
      "organizations",
      "list-tags-for-resource",
      "--resource-id",
      account.Id,
    ];

    const result = await this.processRunner.run(command);

    // TODO: push this into a retry decorator
    if (result.status.code === 254) {
      console.debug("AWS is overheated. We wait one second and continue.");
      await sleep(1000);

      return await this.listTags(account);
    }

    return parseJsonWithLog<TagResponse>(result.stdout).Tags;
  }

  async addTags(account: Account, tags: Tag[]): Promise<void> {
    const command = [
      "aws",
      "organizations",
      "tag-resource",
      "--resource-id",
      account.Id,
      "--tags",
      ...tags.map((t) => `Key=${t.Key},Value=${t.Value}`),
    ];

    await this.processRunner.run(command);
  }

  async removeTags(account: Account, tags: Tag[]): Promise<void> {
    const command = [
      "aws",
      "organizations",
      "untag-resource",
      "--resource-id",
      account.Id,
      "--tag-keys",
      ...tags.map((t) => t.Key),
    ];

    await this.processRunner.run(command);
  }

  async assumeRole(
    roleArn: string,
    credentials?: Credentials,
  ): Promise<Credentials> {
    const command = [
      "aws",
      "sts",
      "assume-role",
      "--role-arn",
      roleArn,
      "--role-session-name",
      "collie-session",
    ];

    const result = await this.run<AssumedRoleResponse>(command, credentials);

    return result.Credentials;
  }

  /**
   * For debugging: will return the identity AWS thinks you are.
   * @param credential Assumed credentials.
   */
  async getCallerIdentity(credential?: Credentials): Promise<CallerIdentity> {
    return await this.run<CallerIdentity>(
      ["aws", "sts", "get-caller-identity"],
      credential,
    );
  }

  async listUsers(credential: Credentials): Promise<User[]> {
    const command = ["aws", "iam", "list-users", "--max-items", "50"];

    const pages = await this.runPaged<UserResponse>(
      command,
      (x) => x.NextToken,
      (x) => ["--starting-token", x],
      credential,
    );

    return pages.flatMap((x) => x.Users);
  }
  async listGroups(credential: Credentials): Promise<Group[]> {
    const command = ["aws", "iam", "list-groups", "--max-items", "50"];

    const pages = await this.runPaged<GroupResponse>(
      command,
      (x) => x.NextToken,
      (x) => ["--starting-token", x],
      credential,
    );

    return pages.flatMap((x) => x.Groups);
  }

  async listUserOfGroup(
    group: Group,
    credential: Credentials,
  ): Promise<User[]> {
    const command = [
      "aws",
      "iam",
      "get-group",
      "--group-name",
      group.GroupName,
      "--max-items",
      "50",
    ];

    const pages = await this.runPaged<UserResponse>(
      command,
      (x) => x.NextToken,
      (x) => ["--starting-token", x],
      credential,
    );

    return pages.flatMap((x) => x.Users);
  }

  async listAttachedGroupPolicies(
    group: Group,
    credential: Credentials,
  ): Promise<Policy[]> {
    const command = [
      "aws",
      "iam",
      "list-attached-group-policies",
      "--group-name",
      group.GroupName,
    ];

    const pages = await this.runPaged<PolicyResponse>(
      command,
      (x) => x.Marker,
      (x) => ["--starting-token", x],
      credential,
    );

    return pages.flatMap((x) => x.AttachedPolicies);
  }

  async listAttachedUserPolicies(
    user: User,
    credential: Credentials,
  ): Promise<Policy[]> {
    const command = [
      "aws",
      "iam",
      "list-attached-user-policies",
      "--user-name",
      user.UserName,
    ];

    const pages = await this.runPaged<PolicyResponse>(
      command,
      (x) => x.Marker,
      (x) => ["--starting-token", x],
      credential,
    );

    return pages.flatMap((x) => x.AttachedPolicies);
  }

  /**
   * https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
   *
   * Note: the actual paging handling has not been tested but has been built by using [listAccounts]' logic and AWS docs.
   */
  async listCosts(startDate: Date, endDate: Date): Promise<CostResponse> {
    const format = "YYYY-MM-DD";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);

    const command = [
      "aws",
      "ce",
      "get-cost-and-usage",
      "--time-period",
      `Start=${start},End=${end}`,
      "--granularity",
      "MONTHLY",
      "--metrics",
      "BLENDED_COST",
      "--group-by",
      "Type=DIMENSION,Key=LINKED_ACCOUNT",
    ];

    const pages = await this.runPaged<CostResponse>(
      command,
      (x) => x.NextPageToken,
      (x) => [`--next-page-token=${x}`],
    );

    // This is a bit hacky but we extend the original response with new data, rather than overwriting it.
    // We do not concat the other values since (we assume) they do not change in-between requests.
    pages[0].ResultsByTime = pages.flatMap((x) => x.ResultsByTime);

    return pages[0];
  }

  private async run<T>(command: string[], credentials?: Credentials) {
    const result = await this.processRunner.run(
      command,
      this.credsToEnv(credentials),
    );

    return parseJsonWithLog<T>(result.stdout);
  }

  private async runPaged<T>(
    command: string[],
    paginationToken: (result: T) => string | undefined,
    paginationOptions: (token: string) => string[],
    credentials?: Credentials,
  ): Promise<T[]> {
    const results: T[] = [];

    let result: T = await this.run<T>(command, credentials);
    results.push(result);

    let token: string | undefined;
    while ((token = paginationToken(result))) {
      const pagedCommand = command.concat(paginationOptions(token));

      result = await this.run<T>(pagedCommand);

      results.push(result);
    }

    return results;
  }

  private credsToEnv(credentials?: Credentials): { [key: string]: string } {
    if (!credentials) {
      return {};
    }

    return {
      AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
      AWS_SESSION_TOKEN: credentials.SessionToken,
    };
  }
}
