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

 export class CustomCliFacade {
   constructor(
     private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
   ) {}

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
 