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
//  import { moment } from "x/deno_moment";
//  import { sleep } from "/promises.ts";
 import { parseJsonWithLog } from "/json.ts";
 import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
 import { IProcessRunner } from "../../process/IProcessRunner.ts";

 export class CustomCliFacade {
   constructor(
     private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
   ) {}

   /**
    * @param credential Assumed credentials.
    */
   async getCallerIdentity(
     credential?: Credentials,
     profile?: string,
   ): Promise<CallerIdentity> {
     const env = {
       ...this.credsToEnv(credential),
     };
   }
 }
 