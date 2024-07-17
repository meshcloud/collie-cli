import {
   Account,
   AccountsResponse,
   AssumedRoleResponse,
   CallerIdentity,
   CostResponse,
   Credentials,
   Group,
   GroupResponse,
   OrganizationalUnit,
   OrganizationalUnitsResponse,
   Policy,
   PolicyResponse,
   RegionsResponse,
   Root,
   RootResponse,
   Tag,
   TagsResponse,
   User,
   UserResponse,
 } from "/api/aws/Model.ts";
 import { moment } from "x/deno_moment";
 import { sleep } from "/promises.ts";
 import { parseJsonWithLog } from "/json.ts";
 
 import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
 import { IProcessRunner } from "../../process/IProcessRunner.ts";
 
 /**
  * Design: We don't have to care about paging because
  * https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html the aws cli already handles it
  *
  * > By default, the AWS CLI uses a page size determined by the individual service and retrieves all available items.
  */
 export class CustomCliFacade {
   constructor(
     private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
   ) {}
 
   async listProfiles(): Promise<string[]> {
     const result = await this.processRunner.run([
       "custom",
       "configure",
       "list-profiles",
     ]);
 
     // this output is not json
     return result.stdout.trim().split("\n");
   }
 
   async listAccountsForParent(parentId: string): Promise<Account[]> {
     const command = [
       "custom",
       "organizations",
       "list-accounts-for-parent",
       "--parent-id",
       parentId,
     ];
 
     const result = await this.run<AccountsResponse>(command);
 
     return result.Accounts;
   }
 
   async listOrganizationalUnitsForParent(
     parentId: string,
   ): Promise<OrganizationalUnit[]> {
     const command = [
       "custom",
       "organizations",
       "list-organizational-units-for-parent",
       "--parent-id",
       parentId,
     ];
 
     const result = await this.run<OrganizationalUnitsResponse>(command);
 
     return result.OrganizationalUnits;
   }
 
   async listTags(account: Account): Promise<Tag[]> {
     const command = [
       "custom",
       "organizations",
       "list-tags-for-resource",
       "--resource-id",
       account.Id,
     ];
 
     const result = await this.processRunner.run(command);
 
     // TODO: push this into a retry decorator
     if (result.status.code === 254) {
       console.debug("Custom is overheated. We wait one second and continue.");
       await sleep(1000);
 
       return await this.listTags(account);
     }
 
     return parseJsonWithLog<TagsResponse>(result.stdout).Tags;
   }
 
   async listRoots(): Promise<Root[]> {
     const command = ["custom", "organizations", "list-roots"];
 
     const result = await this.processRunner.run(command);
 
     return parseJsonWithLog<RootResponse>(result.stdout).Roots;
   }
 
   async addTags(account: Account, tags: Tag[]): Promise<void> {
     const command = [
       "custom",
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
       "custom",
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
       "custom",
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
   async getCallerIdentity(
     credential?: Credentials,
     profile?: string,
   ): Promise<CallerIdentity> {
     const env = {
       ...this.credsToEnv(credential),
       ...(profile ? { CUSTOM_PROFILE: profile } : {}),
     };
 
     const result = await this.processRunner.run(
       ["custom", "sts", "get-caller-identity"],
       { env },
     );
 
     return parseJsonWithLog(result.stdout);
   }
 
   async getConfig(key: "region", profile?: string): Promise<string> {
     const env = {
       ...(profile ? { CUSTOM_PROFILE: profile } : {}),
     };
 
     const result = await this.processRunner.run(
       ["custom", "configure", "get", key],
       { env },
     );
 
     return result.stdout;
   }
 
   async listRegions(profile?: string): Promise<RegionsResponse> {
     const env = {
       ...(profile ? { CUSTOM_PROFILE: profile } : {}),
     };
 
     const result = await this.processRunner.run(
       ["custom", "ec2", "describe-regions", "--all-regions"],
       { env },
     );
 
     return parseJsonWithLog(result.stdout);
   }
 
   async listUsers(credential: Credentials): Promise<User[]> {
     const command = ["custom", "iam", "list-users"];
 
     const result = await this.run<UserResponse>(command, credential);
 
     return result.Users;
   }
 
   async listGroups(credential: Credentials): Promise<Group[]> {
     const command = ["custom", "iam", "list-groups"];
 
     const result = await this.run<GroupResponse>(command, credential);
 
     return result.Groups;
   }
 
   async listUserOfGroup(
     group: Group,
     credential: Credentials,
   ): Promise<User[]> {
     const command = [
       "custom",
       "iam",
       "get-group",
       "--group-name",
       group.GroupName,
     ];
 
     const result = await this.run<UserResponse>(command, credential);
 
     return result.Users;
   }
 
   async listAttachedGroupPolicies(
     group: Group,
     credential: Credentials,
   ): Promise<Policy[]> {
     const command = [
       "custom",
       "iam",
       "list-attached-group-policies",
       "--group-name",
       group.GroupName,
     ];
 
     const result = await this.run<PolicyResponse>(command, credential);
 
     return result.AttachedPolicies;
   }
 
   async listAttachedUserPolicies(
     user: User,
     credential: Credentials,
   ): Promise<Policy[]> {
     const command = [
       "custom",
       "iam",
       "list-attached-user-policies",
       "--user-name",
       user.UserName,
     ];
 
     const result = await this.run<PolicyResponse>(command, credential);
 
     return result.AttachedPolicies;
   }
 
   /**
    * https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
    */
   async listCosts(startDate: Date, endDate: Date): Promise<CostResponse> {
     const format = "YYYY-MM-DD";
     const start = moment(startDate).format(format);
     const end = moment(endDate).format(format);
 
     const command = [
       "custom",
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
 
     const result = await this.run<CostResponse>(command);
 
     return result;
   }
 
   private async run<T>(command: string[], credentials?: Credentials) {
     const result = await this.processRunner.run(
       [...command, "--output", "json"],
       this.credsToEnv(credentials),
     );
 
     return parseJsonWithLog<T>(result.stdout);
   }
 
   private credsToEnv(credentials?: Credentials): { [key: string]: string } {
     if (!credentials) {
       return {};
     }
 
     return {
       CUSTOM_ACCESS_KEY_ID: credentials.AccessKeyId,
       CUSTOM_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
       CUSTOM_SESSION_TOKEN: credentials.SessionToken,
     };
   }
 }
 